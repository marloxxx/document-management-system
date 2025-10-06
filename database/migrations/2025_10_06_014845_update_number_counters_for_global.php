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
        Schema::table('number_counters', function (Blueprint $table) {
            // update unique constraint untuk menghilangkan direction dulu
            $table->dropUnique(['year', 'month', 'direction']);
            $table->unique(['year', 'month']);

            // hapus kolom direction karena sekarang global
            $table->dropColumn('direction');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('number_counters', function (Blueprint $table) {
            $table->string('direction', 8)->after('month');
            $table->dropUnique(['year', 'month']);
            $table->unique(['year', 'month', 'direction']);
        });
    }
};
