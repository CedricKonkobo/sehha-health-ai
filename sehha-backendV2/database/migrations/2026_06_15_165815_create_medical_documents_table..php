<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_documents', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['ordonnance', 'biologie', 'imagerie', 'compte_rendu', 'ecg', 'certificat', 'bilan_triage']);
            $table->string('title', 191);
            $table->date('issued_at')->nullable();
            $table->date('expires_at')->nullable();
            $table->string('storage_path', 500)->nullable();
            $table->string('qr_hash', 64)->nullable();
            $table->jsonb('structured_data')->nullable();
            $table->enum('status', ['valide', 'expire', 'archive', 'annule'])->default('valide');
            $table->boolean('visible_to_patient')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_documents');
    }
};