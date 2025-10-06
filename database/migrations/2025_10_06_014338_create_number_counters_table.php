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
        Schema::create('number_counters', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->string('direction', 8); // 'ID->ZH' | 'ZH->ID'
            // $table->foreignId('owner_user_id')->nullable()->constrained('users'); // aktifkan jika mau per-client
            $table->unsignedInteger('current_seq')->default(0);
            $table->timestamps();

            $table->unique(['year', 'month', 'direction'/*,'owner_user_id'*/]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('number_counters');
    }
};
