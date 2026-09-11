<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('allergies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('users')->cascadeOnDelete();
            $table->text('substance_encrypted')->nullable();
            $table->enum('severity', ['mild', 'moderate', 'severe', 'anaphylactic'])->default('mild');
            $table->text('reaction_description')->nullable();
            $table->date('discovered_at')->nullable();
            $table->foreignId('documented_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('allergies');
    }
};