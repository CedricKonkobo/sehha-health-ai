<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained('services')->nullOnDelete();
            // $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->text('motif')->nullable();
            $table->text('symptoms_notes')->nullable();
            $table->text('diagnosis')->nullable();
            $table->string('icd10_code', 10)->nullable();
            $table->text('treatment')->nullable();
            $table->jsonb('exams_requested')->nullable();
            $table->jsonb('vitals_at_visit')->nullable();
            $table->text('report_text')->nullable();
            $table->boolean('follow_up_required')->default(false);
            $table->date('follow_up_date')->nullable();
            $table->timestamp('consultation_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};