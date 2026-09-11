<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vital_signs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('consultation_id')->nullable()->constrained('consultations')->nullOnDelete();
            $table->enum('type', ['tension_sys', 'tension_dia', 'heart_rate', 'spo2', 'temperature', 'glycemia', 'weight', 'respiratory_rate']);
            $table->decimal('value', 8, 2);
            $table->decimal('value_2', 8, 2)->nullable();
            $table->string('unit', 15);
            $table->timestamp('measured_at')->nullable();
            $table->enum('source', ['medical_device', 'wearable', 'self_reported'])->default('medical_device');
            $table->boolean('is_abnormal')->default(false);
            $table->boolean('alert_sent')->default(false);
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vital_signs');
    }
};