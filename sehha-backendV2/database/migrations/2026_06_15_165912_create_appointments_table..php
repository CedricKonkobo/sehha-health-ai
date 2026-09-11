<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained('services')->nullOnDelete();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])->default('pending');
            $table->boolean('ia_suggested')->default(false);
            $table->text('motif')->nullable();
            $table->foreignId('triage_id')->nullable()->constrained('triage_events')->nullOnDelete();
            $table->boolean('sms_reminder_sent')->default(false);
            $table->smallInteger('queue_number')->nullable();
            $table->timestamps();

            $table->unique(['doctor_id', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};