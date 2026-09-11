<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->constrained('clinics')->cascadeOnDelete();
            $table->string('product_name', 191);
            $table->decimal('quantity', 10, 2)->default(0);
            $table->string('unit', 30);
            $table->decimal('alert_threshold', 10, 2)->default(0);
            $table->enum('status', ['ok', 'faible', 'alerte', 'critique'])->default('ok');
            $table->foreignId('last_updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(); // Remplace la ligne manuelle "updated_at"
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory');
    }
};