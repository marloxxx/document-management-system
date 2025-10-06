<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, increase the column length to accommodate longer direction values
        Schema::table('documents', function (Blueprint $table) {
            $table->string('direction', 20)->change(); // Increase from 8 to 20 characters
        });

        // Then update existing documents to use new direction format
        DB::table('documents')->where('direction', 'ID->ZH')->update(['direction' => 'Indo-Mandarin']);
        DB::table('documents')->where('direction', 'ZH->ID')->update(['direction' => 'Mandarin-Indo']);
        DB::table('documents')->where('direction', 'ID->TW')->update(['direction' => 'Indo-Taiwan']);
        DB::table('documents')->where('direction', 'TW->ID')->update(['direction' => 'Taiwan-Indo']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to old direction format
        DB::table('documents')->where('direction', 'Indo-Mandarin')->update(['direction' => 'ID->ZH']);
        DB::table('documents')->where('direction', 'Mandarin-Indo')->update(['direction' => 'ZH->ID']);
        DB::table('documents')->where('direction', 'Indo-Taiwan')->update(['direction' => 'ID->TW']);
        DB::table('documents')->where('direction', 'Taiwan-Indo')->update(['direction' => 'TW->ID']);

        // Revert column length back to original
        Schema::table('documents', function (Blueprint $table) {
            $table->string('direction', 8)->change();
        });
    }
};
