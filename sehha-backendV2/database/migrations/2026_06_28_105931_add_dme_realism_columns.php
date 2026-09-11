<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // consultations.appointment_id était commenté dans la migration
        // d'origine alors que le modèle Consultation le déclare déjà en
        // fillable + relation -> on l'active réellement ici.
        Schema::table('consultations', function (Blueprint $table) {
            if (!Schema::hasColumn('consultations', 'appointment_id')) {
                $table->foreignId('appointment_id')->nullable()
                    ->after('service_id')
                    ->constrained('appointments')->nullOnDelete();
            }
        });

        // medical_documents : pour le flux OCR -> LLM, on a besoin de stocker
        // à la fois le texte brut extrait par l'OCR et le résumé structuré
        // produit par le LLM, pour que le consultant du DME puisse basculer
        // entre "fichier brut" et "résumé".
        Schema::table('medical_documents', function (Blueprint $table) {
            if (!Schema::hasColumn('medical_documents', 'extracted_text')) {
                $table->text('extracted_text')->nullable()->after('structured_data');
            }
            if (!Schema::hasColumn('medical_documents', 'ai_summary')) {
                $table->text('ai_summary')->nullable()->after('extracted_text');
            }
            if (!Schema::hasColumn('medical_documents', 'source')) {
                // manuel (créé par soignant) vs ocr_scan (scanné par le patient/soignant)
                $table->enum('source', ['manuel', 'ocr_scan'])->default('manuel')->after('ai_summary');
            }
        });
    }

    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            if (Schema::hasColumn('consultations', 'appointment_id')) {
                $table->dropConstrainedForeignId('appointment_id');
            }
        });

        Schema::table('medical_documents', function (Blueprint $table) {
            $table->dropColumn(['extracted_text', 'ai_summary', 'source']);
        });
    }
};
