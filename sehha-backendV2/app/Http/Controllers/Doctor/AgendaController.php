<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AppointmentSlotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgendaController extends Controller
{
    public function __construct(private AppointmentSlotService $slots) {}

    public function show(Request $request, string $uuid): JsonResponse
    {
        $doctor = User::where('uuid', $uuid)
            ->where('role', 'medecin')
            ->firstOrFail();

        $request->validate([
            'date' => ['nullable', 'date'],
            'week_start' => ['nullable', 'date'],
        ]);

        // Vue journalière
        if ($request->has('date')) {
            $slots = $this->slots->getAvailableSlots($doctor->id, $request->date);
            $appointments = \App\Models\Appointment::where('doctor_id', $doctor->id)
                ->whereDate('starts_at', $request->date)
                ->with('patient')
                ->orderBy('starts_at')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'date' => $request->date,
                    'available_slots' => $slots,
                    'appointments' => $appointments->map(fn ($a) => [
                        'uuid' => $a->uuid,
                        'patient_uuid' => $a->patient->uuid,
                        'patient_name' => $a->patient->name,
                        'starts_at' => $a->starts_at->toIso8601String(),
                        'ends_at' => $a->ends_at?->toIso8601String(),
                        'status' => $a->status,
                        'motif' => $a->motif,
                    ]),
                ],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ]);
        }

        // Vue hebdomadaire
        $weekStart = $request->week_start ? \Carbon\Carbon::parse($request->week_start) : now()->startOfWeek();
        $week = [];

        for ($i = 0; $i < 7; $i++) {
            $date = $weekStart->copy()->addDays($i)->format('Y-m-d');
            $slots = $this->slots->getAvailableSlots($doctor->id, $date);
            $rdvCount = \App\Models\Appointment::where('doctor_id', $doctor->id)
                ->whereDate('starts_at', $date)
                ->whereIn('status', ['pending', 'confirmed'])
                ->count();

            $week[] = [
                'date' => $date,
                'day_name' => $weekStart->copy()->addDays($i)->locale('fr')->dayName,
                'available_slots_count' => count($slots),
                'appointments_count' => $rdvCount,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'doctor_uuid' => $doctor->uuid,
                'doctor_name' => $doctor->name,
                'week' => $week,
            ],
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }
}