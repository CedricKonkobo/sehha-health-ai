<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            // On vérifie que la colonne 'appointment_id' existe, sinon on la crée
            if (!Schema::hasColumn('consultations', 'appointment_id')) {
                $table->unsignedBigInteger('appointment_id')->nullable();
            }
            // Ajout de la contrainte étrangère
            $table->foreign('appointment_id')
                  ->references('id')
                  ->on('appointments')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->dropForeign(['appointment_id']);
            $table->dropColumn('appointment_id');
        });
    }
};