<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('cin_hash', 64)->nullable()->index();
            $table->text('cin_encrypted')->nullable();
            $table->string('name', 120);
            $table->text('phone_encrypted')->nullable();
            $table->string('email', 191)->unique()->nullable();
            $table->string('password', 255);
            $table->enum('role', ['patient', 'infirmier', 'medecin', 'admin', 'super_admin'])->default('patient');
            $table->string('otp_secret', 32)->nullable();
            $table->boolean('otp_enabled')->default(false);
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->boolean('is_active')->default(true);
            $table->smallInteger('failed_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};