<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class MonitorEvidenceJobs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'evidence:monitor 
                            {action=list : Action to perform (list, show, clear)}
                            {--job= : Job ID to show details}
                            {--watch : Watch mode - refresh every 2 seconds}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Monitor evidence download jobs';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $action = $this->argument('action');
        $watch = $this->option('watch');

        if ($watch) {
            $this->watchJobs();
            return;
        }

        switch ($action) {
            case 'list':
                $this->listJobs();
                break;
            case 'show':
                $jobId = $this->option('job');
                if (!$jobId) {
                    $this->error('Please provide --job option');
                    return 1;
                }
                $this->showJob($jobId);
                break;
            case 'clear':
                $this->clearOldJobs();
                break;
            default:
                $this->error('Invalid action. Use: list, show, or clear');
                return 1;
        }

        return 0;
    }

    /**
     * List all evidence download jobs
     */
    protected function listJobs()
    {
        $this->info('📋 Evidence Download Jobs');
        $this->line('');

        // Get all cache keys with our prefix
        $jobs = $this->getAllJobs();

        if (empty($jobs)) {
            $this->warn('No active jobs found.');
            return;
        }

        $tableData = [];
        foreach ($jobs as $jobId => $data) {
            $status = $data['status'] ?? 'unknown';
            $progress = $data['progress'] ?? 0;
            $message = $data['message'] ?? '-';
            $updatedAt = $data['updated_at'] ?? '-';

            $tableData[] = [
                'job_id' => substr($jobId, 0, 20) . '...',
                'status' => $this->colorizeStatus($status),
                'progress' => round($progress, 1) . '%',
                'message' => substr($message, 0, 40),
                'updated' => $updatedAt,
            ];
        }

        $this->table(
            ['Job ID', 'Status', 'Progress', 'Message', 'Updated At'],
            $tableData
        );

        $this->line('');
        $this->info('Total jobs: ' . count($jobs));
        $this->line('Use: php artisan evidence:monitor show --job=<job_id> for details');
    }

    /**
     * Show details of a specific job
     */
    protected function showJob(string $jobId)
    {
        $data = Cache::get('evidence_download_job_' . $jobId);

        if (!$data) {
            $this->error('Job not found: ' . $jobId);
            return;
        }

        $this->info('📄 Job Details: ' . $jobId);
        $this->line('');

        $status = $data['status'] ?? 'unknown';
        $this->line('Status:     ' . $this->colorizeStatus($status));
        $this->line('Progress:   ' . round($data['progress'] ?? 0, 1) . '%');
        $this->line('Message:    ' . ($data['message'] ?? '-'));
        $this->line('Created:    ' . ($data['created_at'] ?? '-'));
        $this->line('Updated:    ' . ($data['updated_at'] ?? '-'));

        if (isset($data['filename'])) {
            $this->line('Filename:   ' . $data['filename']);

            $filepath = storage_path('app/temp/' . $data['filename']);
            if (file_exists($filepath)) {
                $size = filesize($filepath);
                $this->line('File Size:  ' . $this->formatBytes($size));
            }
        }

        $this->line('');

        if ($status === 'completed') {
            $this->info('✅ Job completed successfully!');
        } elseif ($status === 'failed') {
            $this->error('❌ Job failed.');
        } elseif ($status === 'processing') {
            $this->comment('⏳ Job is currently processing...');
        } elseif ($status === 'queued') {
            $this->comment('⏸️  Job is queued, waiting to be processed.');
        }
    }

    /**
     * Clear old completed/failed jobs
     */
    protected function clearOldJobs()
    {
        $jobs = $this->getAllJobs();
        $cleared = 0;

        foreach ($jobs as $jobId => $data) {
            $status = $data['status'] ?? 'unknown';

            // Clear completed or failed jobs
            if (in_array($status, ['completed', 'failed'])) {
                Cache::forget('evidence_download_job_' . $jobId);

                // Also delete the zip file if exists
                if (isset($data['filename'])) {
                    $filepath = storage_path('app/temp/' . $data['filename']);
                    if (file_exists($filepath)) {
                        unlink($filepath);
                    }
                }

                $cleared++;
            }
        }

        $this->info("🧹 Cleared {$cleared} old job(s).");
    }

    /**
     * Watch mode - continuously monitor jobs
     */
    protected function watchJobs()
    {
        $this->info('👁️  Watch mode enabled. Press Ctrl+C to exit.');
        $this->line('');

        while (true) {
            // Clear screen
            if (PHP_OS_FAMILY === 'Windows') {
                system('cls');
            } else {
                system('clear');
            }

            $this->info('📋 Evidence Download Jobs (Auto-refresh every 2s)');
            $this->line(date('Y-m-d H:i:s'));
            $this->line('');

            $jobs = $this->getAllJobs();

            if (empty($jobs)) {
                $this->warn('No active jobs found.');
            } else {
                $tableData = [];
                foreach ($jobs as $jobId => $data) {
                    $status = $data['status'] ?? 'unknown';
                    $progress = $data['progress'] ?? 0;
                    $message = $data['message'] ?? '-';

                    $tableData[] = [
                        'job_id' => substr($jobId, 0, 20) . '...',
                        'status' => $this->colorizeStatus($status),
                        'progress' => round($progress, 1) . '%',
                        'message' => substr($message, 0, 40),
                    ];
                }

                $this->table(
                    ['Job ID', 'Status', 'Progress', 'Message'],
                    $tableData
                );

                $this->line('');
                $this->info('Total jobs: ' . count($jobs));
            }

            sleep(2);
        }
    }

    /**
     * Get all jobs from cache
     */
    protected function getAllJobs(): array
    {
        // Laravel doesn't have a native way to get all cache keys
        // We'll use a workaround by storing a list of job IDs

        // For now, we'll scan the cache store directly if using file cache
        $jobs = [];
        $cacheDir = storage_path('framework/cache/data');

        if (!is_dir($cacheDir)) {
            return $jobs;
        }

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($cacheDir)
        );

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $content = @file_get_contents($file->getPathname());
                if ($content) {
                    $data = @unserialize($content);
                    if (is_array($data) && isset($data['s:1:"v";']) && strpos($file->getPathname(), 'evidence_download_job') !== false) {
                        // Extract job ID from filename
                        $basename = basename($file->getPathname());
                        preg_match('/evidence_download_job_([^"]+)/', $content, $matches);
                        if (isset($matches[1])) {
                            $jobId = $matches[1];
                            $jobData = Cache::get('evidence_download_job_' . $jobId);
                            if ($jobData) {
                                $jobs[$jobId] = $jobData;
                            }
                        }
                    }
                }
            }
        }

        return $jobs;
    }

    /**
     * Colorize status text
     */
    protected function colorizeStatus(string $status): string
    {
        return match ($status) {
            'queued' => '<fg=yellow>⏸️  QUEUED</>',
            'processing' => '<fg=blue>⏳ PROCESSING</>',
            'completed' => '<fg=green>✅ COMPLETED</>',
            'failed' => '<fg=red>❌ FAILED</>',
            default => '<fg=gray>❓ UNKNOWN</>',
        };
    }

    /**
     * Format bytes to human readable
     */
    protected function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }
}
