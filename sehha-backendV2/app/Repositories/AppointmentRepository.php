<?php

namespace App\Repositories;

use App\Models\Appointment;

class AppointmentRepository
{
    public function findByUuid(string $uuid): ?Appointment
    {
        return Appointment::where('uuid', $uuid)->first();
    }

    public function getByPatient(int $patientId)
    {
        return Appointment::where('patient_id', $patientId)
            ->with(['doctor', 'service'])
            ->orderBy('starts_at', 'desc')
            ->get();
    }

    public function getByDoctor(int $doctorId)
    {
        return Appointment::where('doctor_id', $doctorId)
            ->with(['patient', 'service'])
            ->orderBy('starts_at', 'desc')
            ->get();
    }

    public function getPendingForDate(int $doctorId, string $date)
    {
        return Appointment::where('doctor_id', $doctorId)
            ->whereDate('starts_at', $date)
            ->whereIn('status', ['pending', 'confirmed'])
            ->orderBy('starts_at')
            ->get();
    }
}