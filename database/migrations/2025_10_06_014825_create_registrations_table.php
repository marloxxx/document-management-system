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
        Schema::create('registrations', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->unsignedInteger('seq');
            $table->string('number')->unique(); // e.g. "01/10/2025"
            $table->enum('state', ['ISSUED', 'PARTIAL', 'COMMITTED', 'VOID'])->default('ISSUED');
            $table->foreignId('issued_to_user_id')->constrained('users');
            $table->timestamp('issued_at');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->unique(['year', 'month', 'seq']); // jaga konsistensi format
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('registrations');
    }
};
