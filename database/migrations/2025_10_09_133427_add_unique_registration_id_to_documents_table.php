<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, handle duplicate registration_ids
        // Find all registration_ids that have more than one document
        $duplicates = DB::table('documents')
            ->select('registration_id', DB::raw('COUNT(*) as count'))
            ->whereNotNull('registration_id')
            ->groupBy('registration_id')
            ->having('count', '>', 1)
            ->get();

        foreach ($duplicates as $duplicate) {
            // Get all documents with this registration_id
            $documents = DB::table('documents')
                ->where('registration_id', $duplicate->registration_id)
                ->orderBy('id')
                ->get();

            // Skip the first document (keep it with the original registration)
            $documentsToUpdate = $documents->slice(1);

            foreach ($documentsToUpdate as $doc) {
                // Get the original registration
                $originalReg = DB::table('registrations')
                    ->where('id', $duplicate->registration_id)
                    ->first();

                // Issue a new registration number for this document
                $year = (int) now('Asia/Jakarta')->format('Y');
                $month = (int) now('Asia/Jakarta')->format('m');

                // Ensure the counter exists
                DB::statement("
                    INSERT IGNORE INTO number_counters (year, month, current_seq) 
                    VALUES (?, ?, 0)
                ", [$year, $month]);

                // Get the current counter and increment
                $counter = DB::table('number_counters')
                    ->where(['year' => $year, 'month' => $month])
                    ->first();

                $existingSeqs = DB::table('registrations')
                    ->where(['year' => $year, 'month' => $month])
                    ->pluck('seq')
                    ->toArray();

                $nextSeq = $counter->current_seq + 1;
                while (in_array($nextSeq, $existingSeqs)) {
                    $nextSeq++;
                }

                // Update the counter
                DB::table('number_counters')
                    ->where(['year' => $year, 'month' => $month])
                    ->update(['current_seq' => $nextSeq]);

                // Create roman numeral for month
                $romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
                $romanMonth = $romanNumerals[$month - 1];
                $number = sprintf('%02d/%s/%04d', $nextSeq, $romanMonth, $year);

                // Create new registration
                $newRegId = DB::table('registrations')->insertGetId([
                    'year' => $year,
                    'month' => $month,
                    'seq' => $nextSeq,
                    'number' => $number,
                    'state' => 'COMMITTED',
                    'issued_to_user_id' => $originalReg->issued_to_user_id,
                    'issued_at' => now('Asia/Jakarta'),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Update the document with the new registration
                DB::table('documents')
                    ->where('id', $doc->id)
                    ->update([
                        'registration_id' => $newRegId,
                        'registration_number' => $number,
                        'registration_year' => $year,
                        'registration_month' => $month,
                        'registration_seq' => $nextSeq,
                        'updated_at' => now(),
                    ]);
            }

            // Update the state of original registration
            $remainingCount = DB::table('documents')
                ->where('registration_id', $duplicate->registration_id)
                ->count();

            DB::table('registrations')
                ->where('id', $duplicate->registration_id)
                ->update(['state' => $remainingCount === 0 ? 'ISSUED' : 'COMMITTED']);
        }

        Schema::table('documents', function (Blueprint $table) {
            // Add unique constraint on registration_id only
            // Satu nomor registrasi hanya bisa untuk satu dokumen
            $table->unique('registration_id');

            // Add foreign key
            $table->foreign('registration_id')
                ->references('id')
                ->on('registrations')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Drop the foreign key
            $table->dropForeign(['registration_id']);

            // Drop the unique constraint on registration_id
            $table->dropUnique(['registration_id']);
        });
    }
};
