<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateUserRequest;
use App\Http\Requests\UpdateInventoryRequest;
use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\Inventory;
use App\Models\Service;
use App\Models\User;
use App\Repositories\AdminRepository;
use App\Services\EmailService;
use App\Services\EncryptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    public function __construct(
        private AdminRepository $admin,
        private EncryptionService $encryption,
        private EmailService $email
    ) {}

    public function users(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => [
                'users' => $users->map(fn ($u) => [
                    'uuid' => $u->uuid,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->role,
                    'is_active' => $u->is_active,
                    'last_login_at' => $u->last_login_at?->toIso8601String(),
                    'created_at' => $u->created_at->toIso8601String(),
                ]),
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'total' => $users->total(),
                    'per_page' => $users->perPage(),
                ],
            ],
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function createUser(CreateUserRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => $data['name'],
            'email' => $data['email'],
            'phone_encrypted' => $this->encryption->encrypt($data['phone']),
            'cin_hash' => $this->encryption->hash($data['cin']),
            'cin_encrypted' => $this->encryption->encrypt($data['cin']),
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'is_active' => true,
            'otp_enabled' => true,
        ]);

        // Créer profil médecin si applicable
        if ($data['role'] === 'medecin') {
            \App\Models\DoctorProfile::create([
                'user_id' => $user->id,
                'clinic_id' => $data['clinic_id'] ?? Clinic::first()?->id,
                'service_id' => $data['service_id'] ?? null,
                'speciality' => $data['speciality'],
                'schedule_json' => [
                    1 => ['is_working' => true, 'start' => '09:00', 'end' => '17:00', 'break_start' => '12:30', 'break_end' => '14:00'],
                    2 => ['is_working' => true, 'start' => '09:00', 'end' => '17:00', 'break_start' => '12:30', 'break_end' => '14:00'],
                    3 => ['is_working' => true, 'start' => '09:00', 'end' => '17:00', 'break_start' => '12:30', 'break_end' => '14:00'],
                    4 => ['is_working' => true, 'start' => '09:00', 'end' => '17:00', 'break_start' => '12:30', 'break_end' => '14:00'],
                    5 => ['is_working' => true, 'start' => '09:00', 'end' => '17:00', 'break_start' => '12:30', 'break_end' => '14:00'],
                    6 => ['is_working' => false],
                    0 => ['is_working' => false],
                ],
            ]);
        }

        // Envoi credentials par email
        $this->email->send($user->email, 'SEHHA - Vos identifiants', "
            <p>Bienvenue sur SEHHA, <strong>{$user->name}</strong>!</p>
            <p>Votre compte a été créé avec le rôle: <strong>{$user->role}</strong></p>
            <p>Email: {$user->email}</p>
            <p>Mot de passe temporaire: {$data['password']}</p>
            <p>Veuillez changer votre mot de passe lors de votre première connexion.</p>
        ");

        return response()->json([
            'success' => true,
            'data' => [
                'user_uuid' => $user->uuid,
                'role' => $user->role,
            ],
            'message' => 'Utilisateur créé avec succès.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ], 201);
    }

    public function updateRole(Request $request, string $uuid): JsonResponse
    {
        $request->validate([
            'role' => ['required', 'in:patient,infirmier,medecin,admin,super_admin'],
        ]);

        $user = User::where('uuid', $uuid)->firstOrFail();

        if ($user->role === 'super_admin' && $request->role !== 'super_admin') {
            // Empêcher de rétrograder le dernier super_admin
            $superAdminCount = User::where('role', 'super_admin')->where('is_active', true)->count();
            if ($superAdminCount <= 1) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'FORBIDDEN',
                        'message' => 'Impossible de modifier le dernier super-admin actif.'
                    ],
                    'meta' => ['timestamp' => now()->toIso8601String()]
                ], 403);
            }
        }

        $oldRole = $user->role;
        $user->update(['role' => $request->role]);

        // Audit log
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'update',
            'resource_type' => 'users',
            'resource_id' => $user->id,
            'old_values' => ['role' => $oldRole],
            'new_values' => ['role' => $request->role],
            'ip_address' => $request->ip(),
            'timestamp' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => ['user_uuid' => $user->uuid, 'new_role' => $user->role],
            'message' => 'Rôle mis à jour.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function disableUser(Request $request, string $uuid): JsonResponse
    {
        $user = User::where('uuid', $uuid)->firstOrFail();

        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'Vous ne pouvez pas désactiver votre propre compte.'
                ],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 403);
        }

        $user->update(['is_active' => false]);

        // Révoquer tous les tokens
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Utilisateur désactivé.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    /**
     * PUT /admin/users/{uuid} — mise à jour des coordonnées d'un utilisateur.
     */
    public function updateUser(Request $request, string $uuid): JsonResponse
    {
        $user = User::where('uuid', $uuid)->firstOrFail();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'nullable', 'email:rfc', 'max:191', 'unique:users,email,'.$user->id],
            'phone' => ['sometimes', 'string', 'regex:/^(\+212|0)[5-7][0-9]{8}$/'],
            'speciality' => ['sometimes', 'in:medecine_generale,cardiologie,pediatrie,urgentiste,maternite,chirurgie'],
        ]);

        $old = $user->only(['name', 'email']);

        if (array_key_exists('name', $data)) {
            $user->name = $data['name'];
        }
        if (array_key_exists('email', $data)) {
            $user->email = $data['email'];
        }
        if (array_key_exists('phone', $data) && $data['phone']) {
            $user->phone_encrypted = $this->encryption->encrypt($data['phone']);
        }
        $user->save();

        if (isset($data['speciality']) && $user->doctorProfile) {
            $user->doctorProfile->update(['speciality' => $data['speciality']]);
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'update',
            'resource_type' => 'users',
            'resource_id' => $user->id,
            'old_values' => $old,
            'new_values' => $user->only(['name', 'email']),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'timestamp' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'uuid' => $user->uuid,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'message' => 'Utilisateur mis à jour.',
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    /**
     * PUT /admin/users/{uuid}/status — activer / désactiver un compte.
     */
    public function updateStatus(Request $request, string $uuid): JsonResponse
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);

        $user = User::where('uuid', $uuid)->firstOrFail();

        if ($user->id === $request->user()->id && ! $data['is_active']) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'Vous ne pouvez pas désactiver votre propre compte.'],
                'meta' => ['timestamp' => now()->toIso8601String()],
            ], 403);
        }

        if ($user->role === 'super_admin' && ! $data['is_active']) {
            $activeSuperAdmins = User::where('role', 'super_admin')->where('is_active', true)->count();
            if ($activeSuperAdmins <= 1) {
                return response()->json([
                    'success' => false,
                    'error' => ['code' => 'FORBIDDEN', 'message' => 'Impossible de désactiver le dernier super-admin actif.'],
                    'meta' => ['timestamp' => now()->toIso8601String()],
                ], 403);
            }
        }

        $old = ['is_active' => $user->is_active];
        $user->update(['is_active' => $data['is_active']]);

        if (! $data['is_active']) {
            $user->tokens()->delete();
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'update',
            'resource_type' => 'users',
            'resource_id' => $user->id,
            'old_values' => $old,
            'new_values' => ['is_active' => $user->is_active],
            'ip_address' => $request->ip(),
            'timestamp' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => ['uuid' => $user->uuid, 'is_active' => $user->is_active],
            'message' => $user->is_active ? 'Compte activé.' : 'Compte désactivé.',
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    /**
     * POST /admin/inventory/{id}/restock — ajoute une quantité au stock.
     */
    public function restock(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['quantity' => ['required', 'numeric', 'min:0']]);

        $item = Inventory::findOrFail($id);
        $oldQuantity = $item->quantity;
        $newQuantity = $oldQuantity + $data['quantity'];

        $status = $this->computeInventoryStatus($newQuantity, (float) $item->alert_threshold);

        $item->update([
            'quantity' => $newQuantity,
            'status' => $status,
            'last_updated_by' => $request->user()->id,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'update',
            'resource_type' => 'inventory',
            'resource_id' => $item->id,
            'old_values' => ['quantity' => $oldQuantity],
            'new_values' => ['quantity' => $newQuantity, 'status' => $status],
            'ip_address' => $request->ip(),
            'timestamp' => now(),
        ]);

        if (in_array($status, ['alerte', 'critique'], true)) {
            try {
                event(new \App\Events\InventoryAlert($item));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('WebSocket inventory event failed: '.$e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'data' => ['item_id' => $item->id, 'quantity' => $newQuantity, 'status' => $status],
            'message' => 'Stock réapprovisionné.',
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    private function computeInventoryStatus(float $quantity, float $threshold): string
    {
        if ($quantity <= $threshold * 0.5) {
            return 'critique';
        }
        if ($quantity <= $threshold) {
            return 'alerte';
        }
        if ($quantity <= $threshold * 1.5) {
            return 'faible';
        }

        return 'ok';
    }

    public function inventory(Request $request): JsonResponse
    {
        $clinicId = $request->has('clinic_id') ? (int) $request->clinic_id : null;

        return response()->json([
            'success' => true,
            'data' => $this->admin->getInventoryStatus($clinicId),
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function updateInventory(UpdateInventoryRequest $request, int $id): JsonResponse
    {
        $item = Inventory::findOrFail($id);

        $data = $request->validated();
        $oldQuantity = $item->quantity;

        // Calcul nouveau statut
        $status = 'ok';
        if ($data['quantity'] <= $data['alert_threshold'] * 0.5) {
            $status = 'critique';
        } elseif ($data['quantity'] <= $data['alert_threshold']) {
            $status = 'alerte';
        } elseif ($data['quantity'] <= $data['alert_threshold'] * 1.5) {
            $status = 'faible';
        }

        $item->update([
            'quantity' => $data['quantity'],
            'alert_threshold' => $data['alert_threshold'],
            'status' => $status,
            'last_updated_by' => $request->user()->id,
            'updated_at' => now(),
        ]);

        // Audit log
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'update',
            'resource_type' => 'inventory',
            'resource_id' => $item->id,
            'old_values' => ['quantity' => $oldQuantity, 'status' => $item->getOriginal('status')],
            'new_values' => ['quantity' => $data['quantity'], 'status' => $status],
            'ip_address' => $request->ip(),
            'timestamp' => now(),
        ]);

        // Alerte si stock bas
        if (in_array($status, ['alerte', 'critique'], true)) {
            \Illuminate\Support\Facades\Log::channel('email')->warning("[STOCK {$status}]", [
                'product' => $item->product_name,
                'quantity' => $data['quantity'],
                'clinic' => $item->clinic?->name,
            ]);
            try {
                event(new \App\Events\InventoryAlert($item));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('WebSocket inventory event failed: '.$e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'item_id' => $item->id,
                'new_status' => $status,
                'quantity' => $data['quantity'],
            ],
            'message' => 'Stock mis à jour.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function equipment(Request $request): JsonResponse
    {
        $equipment = Service::with(['clinic', 'headDoctor'])
            ->get()
            ->map(fn ($s) => [
                'service_id' => $s->id,
                'name' => $s->name,
                'clinic' => $s->clinic?->name,
                'beds_total' => $s->beds_total,
                'beds_occupied' => $s->beds_occupied,
                'head_doctor' => $s->headDoctor?->name,
                'occupation_rate' => $s->beds_total > 0 ? round(($s->beds_occupied / $s->beds_total) * 100, 2) : 0,
            ]);

        return response()->json([
            'success' => true,
            'data' => $equipment,
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function kpis(Request $request): JsonResponse
    {
        $request->validate([
            'period' => ['nullable', 'in:today,week,month'],
            'clinic_id' => ['nullable', 'integer', 'exists:clinics,id'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->admin->getKpis(
                $request->clinic_id,
                $request->period ?? 'today'
            ),
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $filters = $request->only(['user_id', 'action', 'resource_type', 'date_from', 'date_to']);

        $logs = $this->admin->getAuditLogs($filters, $request->per_page ?? 50);

        return response()->json([
            'success' => true,
            'data' => [
                'logs' => $logs->map(fn ($log) => [
                    'id' => $log->id,
                    'user' => $log->user?->name ?? 'Système',
                    'action' => $log->action,
                    'resource_type' => $log->resource_type,
                    'resource_id' => $log->resource_id,
                    'old_values' => $log->old_values,
                    'new_values' => $log->new_values,
                    'ip_address' => $log->ip_address,
                    'timestamp' => $log->timestamp?->toIso8601String(),
                ]),
                'pagination' => [
                    'current_page' => $logs->currentPage(),
                    'total' => $logs->total(),
                    'per_page' => $logs->perPage(),
                ],
            ],
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }
}