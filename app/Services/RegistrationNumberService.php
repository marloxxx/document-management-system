<?php

namespace App\Services;

use App\Models\Document;
use App\Models\NumberCounter;
use App\Models\Registration;
use App\Models\User;
use App\Helpers\RomanNumerals;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegistrationNumberService
{
    // keluarkan satu nomor (sekali), untuk dipakai 0–2 dokumen
    public function issue(User $user): Registration
    {
        $maxRetries = 10;
        $retryCount = 0;

        while ($retryCount < $maxRetries) {
            try {
                return DB::transaction(function () use ($user) {
                    $y = (int) now('Asia/Jakarta')->format('Y');
                    $m = (int) now('Asia/Jakarta')->format('m');

                    // Use a completely different approach: find the next available sequence number
                    // by checking existing registrations and incrementing from there

                    // First, ensure the counter exists
                    DB::statement("
                        INSERT IGNORE INTO number_counters (year, month, current_seq) 
                        VALUES (?, ?, 0)
                    ", [$y, $m]);

                    // Get the current counter value
                    $counter = NumberCounter::where(['year' => $y, 'month' => $m])->first();
                    $currentSeq = $counter->current_seq;

                    // Find the next available sequence number by checking existing registrations
                    $existingSeqs = Registration::where(['year' => $y, 'month' => $m])
                        ->pluck('seq')
                        ->toArray();

                    $nextSeq = $currentSeq + 1;

                    // If the next sequence number is already taken, find the next available one
                    while (in_array($nextSeq, $existingSeqs)) {
                        $nextSeq++;
                    }

                    // Update the counter to the new sequence number
                    $counter->update(['current_seq' => $nextSeq]);

                    $romanMonth = RomanNumerals::toRoman($m);
                    $number = sprintf('%02d/%s/%04d', $nextSeq, $romanMonth, $y);

                    // Create registration - if this fails due to unique constraint,
                    // the transaction will rollback automatically
                    return Registration::create([
                        'year' => $y,
                        'month' => $m,
                        'seq' => $nextSeq,
                        'number' => $number,
                        'state' => 'ISSUED',
                        'issued_to_user_id' => $user->id,
                        'issued_at' => now('Asia/Jakarta'),
                    ]);
                });
            } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
                $retryCount++;

                Log::warning('Registration number collision detected, retrying', [
                    'user_id' => $user->id,
                    'retry_count' => $retryCount,
                    'max_retries' => $maxRetries,
                    'year' => $y ?? null,
                    'month' => $m ?? null,
                    'error' => $e->getMessage()
                ]);

                if ($retryCount >= $maxRetries) {
                    Log::error('Failed to issue registration number after maximum retries', [
                        'user_id' => $user->id,
                        'retry_count' => $retryCount,
                        'error' => $e->getMessage()
                    ]);
                    throw $e;
                }

                // Wait a small random amount before retrying to reduce collision probability
                usleep(rand(10000, 100000)); // 10-100ms
                continue;
            }
        }

        throw new \Exception('Failed to issue registration number after maximum retries');
    }

    // update state registrasi sesuai jumlah dokumen yang sudah ada
    public function refreshState(Registration $reg): void
    {
        $count = $reg->documents()->count();
        $reg->update([
            'state' => $count === 0 ? 'ISSUED' : ($count === 1 ? 'PARTIAL' : 'COMMITTED')
        ]);
    }

    // preview nomor yang akan di-issue (tanpa menyimpan)
    public function preview(): string
    {
        $y = (int) now('Asia/Jakarta')->format('Y');
        $m = (int) now('Asia/Jakarta')->format('m');

        $counter = NumberCounter::where(['year' => $y, 'month' => $m])->first();
        $seq = ($counter?->current_seq ?? 0) + 1;
        $romanMonth = RomanNumerals::toRoman($m);
        return sprintf('%02d/%s/%04d', $seq, $romanMonth, $y);
    }
}
