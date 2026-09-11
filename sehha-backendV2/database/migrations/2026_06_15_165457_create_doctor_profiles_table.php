<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->foreignId('clinic_id')->nullable()->constrained('clinics')->nullOnDelete();
            $table->foreignId('service_id')->nullable()->constrained('services')->nullOnDelete();
            $table->enum('speciality', ['medecine_generale', 'cardiologie', 'pediatrie', 'urgentiste', 'maternite', 'chirurgie'])->nullable();
            $table->enum('grade', ['praticien', 'specialiste', 'chef_urgences'])->nullable();
            $table->string('inami_number', 30)->nullable();
            $table->jsonb('schedule_json')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_profiles');
    }
};