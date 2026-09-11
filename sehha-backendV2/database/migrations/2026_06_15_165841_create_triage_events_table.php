<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('triage_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('triage_date')->nullable();
            $table->enum('ia_score', ['P1', 'P2', 'P3', 'P4'])->nullable();
            $table->smallInteger('ccmu_score')->nullable();
            $table->decimal('ia_confidence', 4, 3)->nullable();
            $table->jsonb('symptoms_json')->nullable();
            $table->jsonb('red_flags')->nullable();
            $table->enum('orientation', ['urgences', 'specialiste', 'medecin_gen', 'teleconsult'])->nullable();
            $table->enum('recommended_delay', ['immediat', 'sous_1h', 'sous_24h', 'sous_48h'])->nullable();
            $table->boolean('human_validated')->default(false);
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('final_outcome')->nullable();
            $table->smallInteger('wait_time_minutes')->nullable();
            $table->boolean('notification_sent')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('triage_events');
    }
};