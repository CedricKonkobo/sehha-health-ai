<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AppointmentSlotService
{
    public function getAvailableSlots(int $doctorId, string $date, int $durationMinutes = 30): array
    {
        $doctor = DoctorProfile::where('user_id', $doctorId)->first();

        if (!$doctor || !$doctor->schedule_json) {
            return [];
        }

        $dayOfWeek = Carbon::parse($date)->dayOfWeek;
        $schedule = $doctor->schedule_json[$dayOfWeek] ?? null;

        if (!$schedule || !($schedule['is_working'] ?? false)) {
            return [];
        }

        $slots = [];
        $start = Carbon::parse("{$date} {$schedule['start']}");
        $end = Carbon::parse("{$date} {$schedule['end']}");
        $breakStart = $schedule['break_start'] ? Carbon::parse("{$date} {$schedule['break_start']}") : null;
        $breakEnd = $schedule['break_end'] ? Carbon::parse("{$date} {$schedule['break_end']}") : null;

        // Récupérer RDV existants
        $existingAppointments = Appointment::where('doctor_id', $doctorId)
            ->whereDate('starts_at', $date)
            ->whereIn('status', ['pending', 'confirmed'])
            ->get();

        while ($start->lt($end)) {
            $slotEnd = $start->copy()->addMinutes($durationMinutes);

            // Vérifier pause déjeuner
            if ($breakStart && $breakEnd && $start->gte($breakStart) && $start->lt($breakEnd)) {
                $start = $breakEnd;
                continue;
            }

            // Vérifier conflit
            $isAvailable = true;
            foreach ($existingAppointments as $apt) {
                if ($start->lt($apt->ends_at) && $slotEnd->gt($apt->starts_at)) {
                    $isAvailable = false;
                    break;
                }
            }

            if ($isAvailable) {
                $slots[] = [
                    'start' => $start->toDateTimeLocalString(),
                    'end' => $slotEnd->toDateTimeLocalString(),
                ];
            }

            $start->addMinutes($durationMinutes);
        }

        return $slots;
    }

    public function suggestBestSlot(int $patientId, int $doctorId, string $preferredDate, array $triageData = []): ?array
    {
        $slots = $this->getAvailableSlots($doctorId, $preferredDate);

        if (empty($slots)) {
            // Chercher le jour suivant
            $nextDay = Carbon::parse($preferredDate)->addDay();
            for ($i = 0; $i < 7; $i++) {
                $slots = $this->getAvailableSlots($doctorId, $nextDay->format('Y-m-d'));
                if (!empty($slots)) {
                    $preferredDate = $nextDay->format('Y-m-d');
                    break;
                }
                $nextDay->addDay();
            }
        }

        if (empty($slots)) {
            return null;
        }

        // Logique IA simple: prioriser matin si triage P2/P3, après-midi si P4
        $score = $triageData['ia_score'] ?? 'P4';
        $preferredHour = in_array($score, ['P1', 'P2']) ? 9 : 14;

        $bestSlot = collect($slots)->sortBy(function ($slot) use ($preferredHour) {
            $hour = Carbon::parse($slot['start'])->hour;
            return abs($hour - $preferredHour);
        })->first();

        return [
            'suggested_slot' => $bestSlot,
            'alternative_slots' => array_slice($slots, 0, 3),
            'ia_suggested' => true,
            'reason' => "Créneau suggéré selon score triage {$score}",
        ];
    }

    public function getDoctorsBySpeciality(string $speciality, ?int $serviceId = null): array
    {
        $query = DoctorProfile::where('speciality', $speciality)
            ->with(['user', 'service', 'clinic']);

        if ($serviceId) {
            $query->where('service_id', $serviceId);
        }

        return $query->get()->map(fn ($doc) => [
            'doctor_uuid' => $doc->user->uuid,
            'name' => $doc->user->name,
            'speciality' => $doc->speciality,
            'grade' => $doc->grade,
            'service' => $doc->service?->name,
            'clinic' => $doc->clinic?->name,
        ])->toArray();
    }
}