<?php

namespace App\Policies;

use App\Models\PatientRecord;
use App\Models\User;

class PatientRecordPolicy
{
    public function view(User $user, PatientRecord $record): bool
    {
        return match ($user->role) {
            'patient' => $user->id === $record->patient_id,
            'infirmier', 'medecin' => true,
            'admin', 'super_admin' => true,
            default => false,
        };
    }

    public function update(User $user, PatientRecord $record): bool
    {
        return in_array($user->role, ['medecin', 'super_admin']);
    }

    public function delete(User $user, PatientRecord $record): bool
    {
        return $user->role === 'super_admin';
    }
}