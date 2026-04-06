<?php

namespace App\Jobs;

use App\Models\Document;
use App\Services\S3GlacierService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class DownloadAllEvidenceJob implements ShouldQueue
{
    use Queueable;

    public $timeout = 3600; // 1 hour timeout

    public $tries = 1; // Only try once

    protected $jobId;

    protected $userId;

    protected $filters;

    protected $documentIds;

    /**
     * Create a new job instance.
     */
    public function __construct(string $jobId, int $userId, array $filters = [], array $documentIds = [])
    {
        $this->jobId = $jobId;
        $this->userId = $userId;
        $this->filters = $filters;
        $this->documentIds = $documentIds;
    }

    /**
     * Execute the job.
     */
    public function handle(S3GlacierService $s3GlacierService): void
    {
        try {
            // Update status to processing
            $this->updateStatus('processing', 'Mengumpulkan file evidence...');

            // Build query
            $query = Document::query()
                ->whereNotNull('evidence_path')
                ->where('evidence_path', '!=', '');

            // Apply filters
            if (! empty($this->filters['owner_user_id'])) {
                $query->where('owner_user_id', $this->filters['owner_user_id']);
            }

            if (! empty($this->filters['direction']) && $this->filters['direction'] !== 'all') {
                $query->where('direction', $this->filters['direction']);
            }

            if (! empty($this->filters['status']) && $this->filters['status'] !== 'all') {
                $query->where('status', $this->filters['status']);
            }

            // Apply document IDs filter if provided
            if (! empty($this->documentIds)) {
                $query->whereIn('id', $this->documentIds);
            }

            $documents = $query->get();

            if ($documents->isEmpty()) {
                $this->updateStatus('failed', 'Tidak ada dokumen dengan file evidence yang ditemukan.');

                return;
            }

            // Create temporary directory
            $tempDir = storage_path('app/temp/evidence_downloads_'.$this->jobId);
            if (! file_exists($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            $downloadedFiles = [];
            $failedFiles = [];
            $totalDocuments = $documents->count();
            $processedCount = 0;

            // Download each evidence file
            foreach ($documents as $document) {
                $processedCount++;
                $this->updateStatus(
                    'processing',
                    "Mengunduh file {$processedCount}/{$totalDocuments}...",
                    ($processedCount / $totalDocuments) * 100
                );

                try {
                    // Check restore status
                    $restoreStatus = $s3GlacierService->checkRestoreStatus($document->evidence_path);

                    if ($restoreStatus['status'] === 'not_archived' || $restoreStatus['status'] === 'completed') {
                        // Download the file
                        $content = $s3GlacierService->downloadRestoredFile($document->evidence_path);

                        if ($content !== false) {
                            // Create a safe filename
                            $originalFilename = basename($document->evidence_path);
                            $extension = pathinfo($originalFilename, PATHINFO_EXTENSION);
                            $safeFilename = $document->registration_number.'_'.$document->id.'.'.$extension;

                            // Remove invalid characters from filename
                            $safeFilename = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', $safeFilename);

                            $filePath = $tempDir.'/'.$safeFilename;
                            file_put_contents($filePath, $content);
                            $downloadedFiles[] = $filePath;
                        } else {
                            $failedFiles[] = $document->registration_number;
                        }
                    } elseif ($restoreStatus['status'] === 'in_progress') {
                        $failedFiles[] = $document->registration_number.' (restore in progress)';
                    } else {
                        // Need to initiate restore
                        $failedFiles[] = $document->registration_number.' (needs restore)';
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to download evidence for document '.$document->id.': '.$e->getMessage());
                    $failedFiles[] = $document->registration_number.' (error: '.$e->getMessage().')';
                }
            }

            // If no files were downloaded successfully
            if (empty($downloadedFiles)) {
                // Clean up temp directory
                if (file_exists($tempDir)) {
                    rmdir($tempDir);
                }

                $this->updateStatus(
                    'failed',
                    'Tidak ada file yang berhasil diunduh. Semua file mungkin perlu di-restore dari Glacier terlebih dahulu.'
                );

                return;
            }

            // Create zip file
            $this->updateStatus('processing', 'Membuat file ZIP...', 95);

            $zipFilename = 'evidence_files_'.date('Y-m-d_His').'.zip';
            $zipPath = storage_path('app/temp/'.$zipFilename);

            $zip = new \ZipArchive;
            if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) === true) {
                foreach ($downloadedFiles as $file) {
                    $zip->addFile($file, basename($file));
                }

                // Add a README if there were failed files
                if (! empty($failedFiles)) {
                    $readmeContent = "Beberapa file tidak dapat diunduh:\n\n";
                    foreach ($failedFiles as $failed) {
                        $readmeContent .= "- $failed\n";
                    }
                    $zip->addFromString('README.txt', $readmeContent);
                }

                $zip->close();
            } else {
                throw new \Exception('Gagal membuat file ZIP');
            }

            // Clean up downloaded files and temp directory
            foreach ($downloadedFiles as $file) {
                if (file_exists($file)) {
                    unlink($file);
                }
            }
            if (file_exists($tempDir)) {
                rmdir($tempDir);
            }

            // Update status to completed
            $this->updateStatus(
                'completed',
                count($downloadedFiles).' file berhasil diunduh dan di-zip.',
                100,
                $zipFilename
            );
        } catch (\Exception $e) {
            Log::error('DownloadAllEvidenceJob failed: '.$e->getMessage());
            $this->updateStatus('failed', 'Terjadi kesalahan: '.$e->getMessage());
        }
    }

    /**
     * Update job status in cache
     */
    protected function updateStatus(string $status, string $message, float $progress = 0, ?string $filename = null): void
    {
        $data = [
            'status' => $status,
            'message' => $message,
            'progress' => $progress,
            'updated_at' => now()->toISOString(),
        ];

        if ($filename) {
            $data['filename'] = $filename;
        }

        // Store in cache for 24 hours
        Cache::put('evidence_download_job_'.$this->jobId, $data, 86400);
    }

    /**
     * Handle job failure
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('DownloadAllEvidenceJob failed: '.$exception->getMessage());
        $this->updateStatus('failed', 'Job gagal: '.$exception->getMessage());
    }
}
