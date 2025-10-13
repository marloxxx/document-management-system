<?php

namespace App\Services;

use Aws\S3\S3Client;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class S3GlacierService
{
    protected $disk;
    protected $s3Client;

    public function __construct()
    {
        $this->disk = Storage::disk('s3_glacier');

        // Inisialisasi S3 Client untuk operasi advanced
        $this->s3Client = new S3Client([
            'version' => 'latest',
            'region'  => config('filesystems.disks.s3_glacier.region'),
            'credentials' => [
                'key'    => config('filesystems.disks.s3_glacier.key'),
                'secret' => config('filesystems.disks.s3_glacier.secret'),
            ],
        ]);
    }

    /**
     * Upload file ke S3 Glacier
     * 
     * @param UploadedFile|string $file
     * @param string $path
     * @param string $storageClass GLACIER, DEEP_ARCHIVE, GLACIER_IR
     * @return string|false Path file yang diupload atau false jika gagal
     */
    public function uploadToGlacier($file, string $path, string $storageClass = 'GLACIER')
    {
        try {
            if ($file instanceof UploadedFile) {
                $content = file_get_contents($file->getRealPath());
            } else {
                $content = file_get_contents($file);
            }

            $result = $this->s3Client->putObject([
                'Bucket' => config('filesystems.disks.s3_glacier.bucket'),
                'Key'    => $path,
                'Body'   => $content,
                'StorageClass' => $storageClass,
            ]);

            return $path;
        } catch (\Exception $e) {
            Log::error('Failed to upload to Glacier: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Inisiasi restore file dari Glacier
     * 
     * @param string $path
     * @param int $days Jumlah hari file tersedia setelah restore
     * @param string $tier Expedited, Standard, atau Bulk
     * @return bool
     */
    public function initiateRestore(string $path, int $days = 7, string $tier = 'Standard')
    {
        try {
            $this->s3Client->restoreObject([
                'Bucket' => config('filesystems.disks.s3_glacier.bucket'),
                'Key'    => $path,
                'RestoreRequest' => [
                    'Days' => $days,
                    'GlacierJobParameters' => [
                        'Tier' => $tier, // Expedited (1-5 min), Standard (3-5 jam), Bulk (5-12 jam)
                    ],
                ],
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to initiate restore: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Cek status restore file
     * 
     * @param string $path
     * @return array Status restore
     */
    public function checkRestoreStatus(string $path): array
    {
        try {
            $result = $this->s3Client->headObject([
                'Bucket' => config('filesystems.disks.s3_glacier.bucket'),
                'Key'    => $path,
            ]);

            $restore = $result->get('Restore');

            if (!$restore) {
                return [
                    'status' => 'not_archived',
                    'message' => 'File tidak dalam status archived'
                ];
            }

            // Parse restore status
            if (strpos($restore, 'ongoing-request="true"') !== false) {
                return [
                    'status' => 'in_progress',
                    'message' => 'Restore sedang dalam proses'
                ];
            } elseif (strpos($restore, 'ongoing-request="false"') !== false) {
                preg_match('/expiry-date="([^"]+)"/', $restore, $matches);
                return [
                    'status' => 'completed',
                    'message' => 'Restore selesai',
                    'expiry_date' => $matches[1] ?? null
                ];
            }

            return [
                'status' => 'unknown',
                'message' => 'Status tidak diketahui',
                'raw' => $restore
            ];
        } catch (\Exception $e) {
            Log::error('Failed to check restore status: ' . $e->getMessage());
            return [
                'status' => 'error',
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Download file yang sudah di-restore
     * 
     * @param string $path
     * @return string|false Content file atau false jika gagal
     */
    public function downloadRestoredFile(string $path)
    {
        try {
            $status = $this->checkRestoreStatus($path);

            if ($status['status'] !== 'completed' && $status['status'] !== 'not_archived') {
                throw new \Exception('File belum selesai di-restore. Status: ' . $status['status']);
            }

            return $this->disk->get($path);
        } catch (\Exception $e) {
            Log::error('Failed to download restored file: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Hapus file dari Glacier
     * 
     * @param string $path
     * @return bool
     */
    public function deleteFile(string $path): bool
    {
        try {
            return $this->disk->delete($path);
        } catch (\Exception $e) {
            Log::error('Failed to delete file: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * List semua file di bucket
     * 
     * @param string $prefix
     * @return array
     */
    public function listFiles(string $prefix = ''): array
    {
        try {
            $files = $this->disk->files($prefix);
            return $files;
        } catch (\Exception $e) {
            Log::error('Failed to list files: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get file metadata
     * 
     * @param string $path
     * @return array|false
     */
    public function getFileMetadata(string $path)
    {
        try {
            $result = $this->s3Client->headObject([
                'Bucket' => config('filesystems.disks.s3_glacier.bucket'),
                'Key'    => $path,
            ]);

            return [
                'size' => $result->get('ContentLength'),
                'last_modified' => $result->get('LastModified'),
                'storage_class' => $result->get('StorageClass'),
                'content_type' => $result->get('ContentType'),
                'etag' => $result->get('ETag'),
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get file metadata: ' . $e->getMessage());
            return false;
        }
    }
}
