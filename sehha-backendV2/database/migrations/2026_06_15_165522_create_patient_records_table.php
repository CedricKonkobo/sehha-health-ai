<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->enum('blood_group', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])->nullable();
            $table->smallInteger('height_cm')->nullable();
            $table->enum('coverage_type', ['cnss', 'ramed', 'axa', 'saham', 'mamda', 'prive'])->default('prive');
            $table->foreignId('referring_doctor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_records');
    }
};