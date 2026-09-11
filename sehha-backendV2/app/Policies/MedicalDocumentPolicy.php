<?php

namespace App\Policies;

use App\Models\MedicalDocument;
use App\Models\User;

class MedicalDocumentPolicy
{
    public function view(User $user, MedicalDocument $doc): bool
    {
        if ($user->role === 'patient') {
            return $user->id === $doc->patient_id && $doc->visible_to_patient;
        }
        return in_array($user->role, ['infirmier', 'medecin', 'admin', 'super_admin']);
    }

    public function create(User $user): bool
    {
        return $user->role === 'medecin';
    }

    public function verifyQr(User $user): bool
    {
        return true; // Public pour pharmacie
    }
}