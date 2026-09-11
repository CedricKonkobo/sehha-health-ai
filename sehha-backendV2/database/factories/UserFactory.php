<?php

namespace Database\Factories;

use App\Models\User;
use App\Services\EncryptionService;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        $encryption = app(EncryptionService::class);
        $cin = strtoupper(fake()->randomLetter() . fake()->randomLetter()) . fake()->numerify('######');

        return [
            'uuid' => (string) Str::uuid(),
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone_encrypted' => $encryption->encrypt('0' . fake()->numberBetween(5, 7) . fake()->numerify('########')),
            'cin_hash' => $encryption->hash($cin),
            'cin_encrypted' => $encryption->encrypt($cin),
            'password' => Hash::make('password123'),
            'role' => 'patient',
            'otp_enabled' => false,
            'is_active' => true,
            'failed_attempts' => 0,
        ];
    }

    public function patient(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'patient',
            'email' => fake()->unique()->safeEmail(),
        ]);
    }

    public function medecin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'medecin',
            'name' => 'Dr. ' . fake()->lastName() . ' ' . fake()->firstName(),
            'email' => 'dr.' . fake()->userName() . '@sehha.ma',
            'otp_enabled' => true,
        ]);
    }

    public function infirmier(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'infirmier',
            'email' => 'inf.' . fake()->userName() . '@sehha.ma',
            'otp_enabled' => true,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
            'email' => 'admin@sehha.ma',
            'otp_enabled' => true,
        ]);
    }

    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'super_admin',
            'email' => 'superadmin@sehha.ma',
            'otp_enabled' => true,
        ]);
    }
}