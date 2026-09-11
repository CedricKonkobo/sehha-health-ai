<?php

namespace App\Repositories;

use App\Models\Allergy;
use App\Models\MedicalHistory;
use App\Models\PatientRecord;
use App\Models\User;
use App\Models\VitalSign;
use App\Services\EncryptionService;

class PatientRepository
{
    public function __construct(private EncryptionService $encryption) {}

    public function findByUuid(string $uuid): ?User
    {
        return User::where('uuid', $uuid)->where('role', 'patient')->first();
    }

    public function getOrCreateRecord(int $patientId): PatientRecord
    {
        return PatientRecord::firstOrCreate(
            ['patient_id' => $patientId],
            [
                'blood_group' => null,
                'height_cm' => null,
                'coverage_type' => 'prive',
            ]
        );
    }

    public function getAllergies(int $patientId)
    {
        return Allergy::where('patient_id', $patientId)
            ->with('documentedBy')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'substance' => $this->encryption->decrypt($a->substance_encrypted),
                'severity' => $a->severity,
                'reaction_description' => $a->reaction_description,
                'discovered_at' => $a->discovered_at?->format('Y-m-d'),
                'documented_by' => $a->documentedBy?->name,
                'created_at' => $a->created_at->toIso8601String(),
            ]);
    }

    public function getMedicalHistory(int $patientId)
    {
        return MedicalHistory::where('patient_id', $patientId)
            ->orderBy('started_at', 'desc')
            ->get()
            ->map(fn ($h) => [
                'id' => $h->id,
                'type' => $h->type,
                'description' => $this->encryption->decrypt($h->description_encrypted),
                'started_at' => $h->started_at?->format('Y-m-d'),
                'resolved_at' => $h->resolved_at?->format('Y-m-d'),
                'created_at' => $h->created_at->toIso8601String(),
            ]);
    }

    public function getVitalSigns(int $patientId, ?int $limit = 50)
    {
        return VitalSign::where('patient_id', $patientId)
            ->orderBy('measured_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'type' => $v->type,
                'value' => $v->value,
                'value_2' => $v->value_2,
                'unit' => $v->unit,
                'measured_at' => $v->measured_at?->toIso8601String(),
                'source' => $v->source,
                'is_abnormal' => $v->is_abnormal,
                'note' => $v->note,
            ]);
    }
}