<?php

namespace App\Http\Controllers\Patient;

use App\Events\AppointmentUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAppointmentRequest;
use App\Models\Appointment;
use App\Models\DoctorProfile;
use App\Models\TriageEvent;
use App\Models\User;
use App\Services\AppointmentSlotService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AppointmentController extends Controller
{
    public function __construct(
        private AppointmentSlotService $slots,
        private NotificationService $notification
    ) {}

    public function slots(Request $request): JsonResponse
    {
        $request->validate([
            'doctor_uuid' => ['required', 'uuid', 'exists:users,uuid'],
            'date' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $doctor = User::where('uuid', $request->doctor_uuid)
            ->whereIn('role', ['medecin'])
            ->firstOrFail();

        $availableSlots = $this->slots->getAvailableSlots($doctor->id, $request->date);

        return response()->json([
            'success' => true,
            'data' => [
                'doctor_uuid' => $doctor->uuid,
                'doctor_name' => $doctor->name,
                'date' => $request->date,
                'slots' => $availableSlots,
            ],
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    public function iaSuggest(Request $request): JsonResponse
    {
        $request->validate([
            'doctor_uuid' => ['required', 'uuid', 'exists:users,uuid'],
            'preferred_date' => ['required', 'date'],
            'triage_uuid' => ['nullable', 'uuid', 'exists:triage_events,uuid'],
        ]);

        $doctor = User::where('uuid', $request->doctor_uuid)->firstOrFail();
        $patient = $request->user();

        $triageData = [];
        if ($request->triage_uuid) {
            $triage = TriageEvent::where('uuid', $request->triage_uuid)
                ->where('patient_id', $patient->id)
                ->first();
            if ($triage) {
                $triageData = [
                    'ia_score' => $triage->ia_score,
                    'orientation' => $triage->orientation,
                ];
            }
        }

        $suggestion = $this->slots->suggestBestSlot(
            $patient->id,
            $doctor->id,
            $request->preferred_date,
            $triageData
        );

        if (! $suggestion) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'NO_SLOTS_AVAILABLE',
                    'message' => 'Aucun créneau disponible dans les 7 prochains jours.',
                ],
                'meta' => ['timestamp' => now()->toIso8601String()],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $suggestion,
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    public function store(StoreAppointmentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $patient = $request->user();

        // Si admin/médecin crée pour un patient
        if (in_array($patient->role, ['medecin', 'admin', 'super_admin']) && isset($data['patient_uuid'])) {
            $patient = User::where('uuid', $data['patient_uuid'])->firstOrFail();
        }

        $doctor = User::where('uuid', $data['doctor_uuid'])->firstOrFail();

        // Règle métier : un triage P1 oriente obligatoirement vers les urgences,
        // il ne peut pas générer un rendez-vous (cf. architecture backend 5.1).
        if (! empty($data['triage_uuid'])) {
            $triage = TriageEvent::where('uuid', $data['triage_uuid'])->first();
            if ($triage && $triage->ia_score === 'P1') {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'P1_NO_APPOINTMENT',
                        'message' => 'Un cas P1 doit se présenter aux urgences immédiatement, aucun rendez-vous ne peut être pris.',
                    ],
                    'meta' => ['timestamp' => now()->toIso8601String()],
                ], 422);
            }
        }

        // Vérifier un seul RDV par jour par médecin
        $existingToday = Appointment::where('patient_id', $patient->id)
            ->where('doctor_id', $doctor->id)
            ->whereDate('starts_at', date('Y-m-d', strtotime($data['starts_at'])))
            ->whereIn('status', ['pending', 'confirmed'])
            ->exists();

        if ($existingToday) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CONFLICT',
                    'message' => 'Vous avez déjà un rendez-vous avec ce médecin ce jour.',
                ],
                'meta' => ['timestamp' => now()->toIso8601String()],
            ], 409);
        }

        // Vérifier créneau libre
        $startTime = Carbon::parse($data['starts_at']);
        $endTime = $startTime->copy()->addMinutes(30);

        $conflict = Appointment::where('doctor_id', $doctor->id)
            ->where('starts_at', '<', $endTime)
            ->where('ends_at', '>', $startTime)
            ->whereIn('status', ['pending', 'confirmed'])
            ->exists();

        if ($conflict) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CONFLICT',
                    'message' => 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.',
                ],
                'meta' => ['timestamp' => now()->toIso8601String()],
            ], 409);
        }

        $appointment = Appointment::create([
            'uuid' => (string) Str::uuid(),
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'service_id' => $data['service_id'] ?? $doctor->doctorProfile?->service_id,
            'starts_at' => $startTime,
            'ends_at' => $endTime,
            'status' => 'pending',
            'ia_suggested' => $data['ia_suggested'] ?? false,
            'motif' => $data['motif'],
            'triage_id' => (! empty($data['triage_uuid'])) ? TriageEvent::where('uuid', $data['triage_uuid'])->first()?->id : null,
        ]);

        // Notification
        $this->notification->sendAppointmentConfirmation($appointment);

        // WebSocket
        try {
            event(new AppointmentUpdated($appointment));
        } catch (\Exception $e) {
            Log::error('WebSocket appointment event failed: '.$e->getMessage());
        }

        return response()->json([
            'success' => true,
            'data' => $this->appointmentResponse($appointment),
            'message' => 'Rendez-vous demandé, en attente de confirmation par le médecin.',
            'meta' => ['timestamp' => now()->toIso8601String()],
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Appointment::with(['patient', 'doctor', 'service', 'triage']);

        if ($user->role === 'patient') {
            $query->where('patient_id', $user->id);
        } elseif ($user->role === 'medecin') {
            $query->where('doctor_id', $user->id);
        }

        $appointments = $query->orderBy('starts_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $appointments->map(fn ($a) => $this->appointmentResponse($a)),
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    public function show(Request $request, string $uuid): JsonResponse
    {
        $appointment = Appointment::where('uuid', $uuid)
            ->with(['patient', 'doctor', 'service', 'triage'])
            ->firstOrFail();

        Gate::authorize('view', $appointment);

        return response()->json([
            'success' => true,
            'data' => $this->appointmentResponse($appointment),
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    public function update(Request $request, string $uuid): JsonResponse
    {
        $appointment = Appointment::where('uuid', $uuid)->firstOrFail();

        Gate::authorize('update', $appointment);

        $data = $request->validate([
            'status' => ['sometimes', 'in:pending,confirmed,cancelled,completed,no_show'],
            'starts_at' => ['sometimes', 'date', 'after:now'],
            'motif' => ['sometimes', 'string', 'max:500'],
        ]);

        $oldStatus = $appointment->status;

        if (isset($data['starts_at'])) {
            $data['ends_at'] = Carbon::parse($data['starts_at'])->addMinutes(30);
        }

        $appointment->update($data);

        // Si annulation < 2h avant, notifier médecin
        if (($data['status'] ?? null) === 'cancelled' && $oldStatus !== 'cancelled') {
            $hoursUntil = now()->diffInHours($appointment->starts_at, false);
            if ($hoursUntil < 2) {
                Log::channel('email')->warning('[RDV CANCEL LATE]', [
                    'appointment_uuid' => $appointment->uuid,
                    'hours_until' => $hoursUntil,
                ]);
            }
        }

        // WebSocket
        try {
            event(new AppointmentUpdated($appointment));
        } catch (\Exception $e) {
            Log::error('WebSocket appointment event failed: '.$e->getMessage());
        }

        return response()->json([
            'success' => true,
            'data' => $this->appointmentResponse($appointment),
            'message' => 'Rendez-vous mis à jour.',
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    public function destroy(Request $request, string $uuid): JsonResponse
    {
        $appointment = Appointment::where('uuid', $uuid)->firstOrFail();

        Gate::authorize('delete', $appointment);

        $appointment->update(['status' => 'cancelled']);

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Rendez-vous annulé.',
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    private function appointmentResponse(Appointment $a): array
    {
        return [
            'uuid' => $a->uuid,
            'patient' => [
                'uuid' => $a->patient->uuid,
                'name' => $a->patient->name,
            ],
            'doctor' => [
                'uuid' => $a->doctor->uuid,
                'name' => $a->doctor->name,
            ],
            'service' => $a->service?->name,
            'starts_at' => $a->starts_at->toIso8601String(),
            'ends_at' => $a->ends_at?->toIso8601String(),
            'status' => $a->status,
            'ia_suggested' => $a->ia_suggested,
            'motif' => $a->motif,
            'triage_score' => $a->triage?->ia_score,
            'queue_number' => $a->queue_number,
            'created_at' => $a->created_at->toIso8601String(),
        ];
    }

    public function doctors(Request $request): JsonResponse
    {
        $request->validate([
            'speciality' => ['nullable', 'in:medecine_generale,cardiologie,pediatrie,urgentiste,maternite,chirurgie'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
        ]);

        $query = DoctorProfile::with(['user', 'service', 'clinic'])
            ->whereHas('user', fn ($q) => $q->where('is_active', true));

        if ($request->has('speciality')) {
            $query->where('speciality', $request->speciality);
        }
        if ($request->has('service_id')) {
            $query->where('service_id', $request->service_id);
        }

        $doctors = $query->get()->map(function ($doc) {
            // Le nom est stocké "Dr. Prénom Nom" -> on retire le préfixe "Dr."
            // avant de séparer prénom / nom (sinon last_name = "Dr." -> "Dr. Prénom Dr." côté front).
            $clean = trim(preg_replace('/^\s*(dr\.?|docteur)\s+/i', '', $doc->user->name));
            $parts = preg_split('/\s+/', $clean) ?: [];

            return [
                'uuid' => $doc->user->uuid,
                'first_name' => $parts[0] ?? $doc->user->name,
                'last_name' => count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : '',
                'full_name' => $doc->user->name,
                'specialty' => $doc->speciality,
                'grade' => $doc->grade,
                'service' => $doc->service?->name,
                'clinic' => $doc->clinic?->name,
                'rating' => fake()->randomFloat(1, 3.5, 5.0), // TODO: vraie table ratings
                'avatar_url' => null, // TODO: storage avatars
                'schedule' => $doc->schedule_json,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $doctors,
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }
}
