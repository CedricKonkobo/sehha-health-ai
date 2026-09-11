<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Consultation;
use App\Models\MedicalDocument;
use App\Models\TriageEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function kpis(Request $request): JsonResponse
    {
        $doctor = $request->user();
        $today = now()->startOfDay();

        $patientsWaiting = TriageEvent::where('created_at', '>=', $today)
            ->where('human_validated', false)
            ->whereIn('ia_score', ['P1', 'P2'])
            ->count();

        $consultationsToday = Consultation::where('doctor_id', $doctor->id)
            ->whereDate('consultation_date', today())
            ->count();

        $avgWaitTime = TriageEvent::whereNotNull('wait_time_minutes')
            ->where('created_at', '>=', $today->subDays(7))
            ->avg('wait_time_minutes');

        $prescriptionsToday = MedicalDocument::where('created_by', $doctor->id)
            ->where('type', 'ordonnance')
            ->whereDate('created_at', today())
            ->count();

        $triageByPriority = [
            'P1' => TriageEvent::where('created_at', '>=', $today)->where('ia_score', 'P1')->count(),
            'P2' => TriageEvent::where('created_at', '>=', $today)->where('ia_score', 'P2')->count(),
            'P3' => TriageEvent::where('created_at', '>=', $today)->where('ia_score', 'P3')->count(),
            'P4' => TriageEvent::where('created_at', '>=', $today)->where('ia_score', 'P4')->count(),
        ];

        $nextAppointments = Appointment::where('doctor_id', $doctor->id)
            ->where('starts_at', '>=', now())
            ->whereIn('status', ['pending', 'confirmed'])
            ->with('patient')
            ->orderBy('starts_at')
            ->limit(5)
            ->get()
            ->map(fn ($a) => [
                'uuid' => $a->uuid,
                'patient_name' => $a->patient->name,
                'starts_at' => $a->starts_at->toIso8601String(),
                'motif' => $a->motif,
                'status' => $a->status,
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'kpis' => [
                    'patients_waiting' => (int) $patientsWaiting,
                    'consultations_today' => (int) $consultationsToday,
                    'avg_wait_time_minutes' => round($avgWaitTime ?? 0, 2),
                    'prescriptions_today' => (int) $prescriptionsToday,
                    'triage_by_priority' => $triageByPriority,
                ],
                'next_appointments' => $nextAppointments,
            ],
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }
}