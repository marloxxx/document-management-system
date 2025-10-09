<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // tambahkan FK ke registrations hanya jika belum ada
            if (!Schema::hasColumn('documents', 'registration_id')) {
                $table->foreignId('registration_id')->after('owner_user_id')
                    ->nullable()->constrained('registrations')->nullOnDelete();
            }

            // optional: simpan cache number agar mudah ditampilkan
            $table->string('registration_number')->nullable()->change(); // tidak lagi unique
        });

        // tambahkan unique constraint: 1 registration = 1 document
        if (!Schema::hasIndex('documents', 'documents_registration_id_unique')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->unique('registration_id'); // Satu nomor registrasi hanya untuk satu dokumen
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['registration_id']);
            $table->dropColumn('registration_id');
            $table->unique('registration_number'); // kembalikan bila perlu
        });
    }
};
