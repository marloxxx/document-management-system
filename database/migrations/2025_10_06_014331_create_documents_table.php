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
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_user_id')->constrained('users');
            $table->string('direction', 8); // 'ID->ZH' | 'ZH->ID'
            $table->string('registration_number')->unique();
            $table->unsignedSmallInteger('registration_year');
            $table->unsignedTinyInteger('registration_month');
            $table->unsignedInteger('registration_seq');
            $table->foreignId('document_type_id')->nullable()->constrained('document_types');
            $table->string('document_type_text')->nullable();
            $table->unsignedInteger('page_count')->default(1);
            $table->string('title')->nullable();
            $table->text('notes')->nullable();
            $table->date('issued_date')->nullable();
            $table->string('evidence_path')->nullable();
            $table->string('evidence_mime')->nullable();
            $table->unsignedBigInteger('evidence_size')->nullable();
            $table->enum('status', ['DRAFT', 'SUBMITTED'])->default('DRAFT');
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['owner_user_id', 'status', 'registration_year', 'registration_month'], 'docs_owner_status_year_month_idx');
            $table->index(['direction', 'document_type_id'], 'docs_direction_type_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
