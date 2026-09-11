<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // bcrypt produit toujours 60 caractères -> 32 était trop court.
            // 255 laisse de la marge si l'algo de hash change un jour.
            $table->string('otp_secret', 255)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('otp_secret', 32)->nullable()->change();
        });
    }
};