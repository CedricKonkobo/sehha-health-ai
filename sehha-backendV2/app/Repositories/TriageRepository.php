<?php

namespace App\Repositories;

use App\Models\TriageEvent;

class TriageRepository
{
    public function findByUuid(string $uuid): ?TriageEvent
    {
        return TriageEvent::where('uuid', $uuid)->first();
    }

    public function getRecentByPatient(int $patientId, int $limit = 10)
    {
        return TriageEvent::where('patient_id', $patientId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }
}