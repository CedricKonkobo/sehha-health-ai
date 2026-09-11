<?php

namespace App\Policies;

use App\Models\Appointment;
use App\Models\User;

class AppointmentPolicy
{
    public function view(User $user, Appointment $appointment): bool
    {
        return match ($user->role) {
            'patient' => $user->id === $appointment->patient_id,
            'medecin' => $user->id === $appointment->doctor_id,
            'admin', 'super_admin' => true,
            default => false,
        };
    }

    public function update(User $user, Appointment $appointment): bool
    {
        return match ($user->role) {
            'patient' => $user->id === $appointment->patient_id,
            'medecin' => $user->id === $appointment->doctor_id,
            'admin', 'super_admin' => true,
            default => false,
        };
    }

    public function delete(User $user, Appointment $appointment): bool
    {
        return in_array($user->role, ['admin', 'super_admin']) || $user->id === $appointment->patient_id;
    }
}