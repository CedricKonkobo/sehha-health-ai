<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinics', function (Blueprint $table) {
            $table->id();
            $table->string('name', 191);
            $table->text('address')->nullable();
            $table->string('city', 80)->nullable();
            $table->string('phone', 20)->nullable();
            $table->enum('type', ['privee', 'publique', 'conventionnee'])->default('privee');
            $table->smallInteger('capacity_beds')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clinics');
    }
};