<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['chirurgie', 'pathologie_chronique', 'pathologie_aigue', 'traitement_long_terme']);
            $table->text('description_encrypted')->nullable();
            $table->date('started_at')->nullable();
            $table->date('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_history');
    }
};