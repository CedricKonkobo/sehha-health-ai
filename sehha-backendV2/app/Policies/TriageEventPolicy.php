<?php

namespace App\Policies;

use App\Models\TriageEvent;
use App\Models\User;

class TriageEventPolicy
{
    public function view(User $user, TriageEvent $triage): bool
    {
        return match ($user->role) {
            'patient' => $user->id === $triage->patient_id,
            'infirmier', 'medecin', 'admin' => true,
            'super_admin' => true,
            default => false,
        };
    }

    public function validate(User $user): bool
    {
        // L'infirmier d'accueil valide/corrige le score de triage (cf. spec).
        return in_array($user->role, ['infirmier', 'medecin', 'admin', 'super_admin']);
    }

    public function viewQueue(User $user): bool
    {
        return in_array($user->role, ['infirmier', 'medecin', 'admin', 'super_admin']);
    }
}