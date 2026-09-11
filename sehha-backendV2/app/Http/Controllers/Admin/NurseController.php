<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Service;
use App\Models\TriageEvent;
use App\Models\VitalSign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NurseController extends Controller
{
    // ========== EXISTANT ==========
    public function updateCapacity(Request $request): JsonResponse
    {
        $request->validate([
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'beds_occupied' => ['required', 'integer', 'min:0'],
        ]);

        $service = Service::findOrFail($request->service_id);

        if ($request->beds_occupied > $service->beds_total) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Lits occupés > capacité totale.'
                ],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 422);
        }

        $oldOccupied = $service->beds_occupied;
        $service->update(['beds_occupied' => $request->beds_occupied]);

        try {
            event(new \App\Events\BedsCapacityUpdated($service));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('WebSocket beds event failed: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'data' => [
                'service_id' => $service->id,
                'service_name' => $service->name,
                'beds_total' => $service->beds_total,
                'beds_occupied' => $service->beds_occupied,
                'beds_available' => $service->beds_total - $service->beds_occupied,
            ],
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    // ========== NOUVEAU ==========

    public function beds(Request $request): JsonResponse
    {
        $services = Service::with(['clinic'])
            ->where('beds_total', '>', 0)
            ->get();

        $beds = [];
        foreach ($services as $service) {
            for ($i = 1; $i <= $service->beds_total; $i++) {
                $isOccupied = $i <= $service->beds_occupied;
                $beds[] = [
                    'id' => "{$service->id}-{$i}",
                    'service_id' => $service->id,
                    'department' => $service->name,
                    'room' => "Salle " . ceil($i / 4),
                    'bed_number' => $i,
                    'status' => $isOccupied ? 'occupied' : 'available',
                    'patient' => $isOccupied ? [
                        'name' => 'Patient ' . fake()->lastName(),
                        'admission_date' => fake()->dateTimeBetween('-3 days', 'now')->format('Y-m-d'),
                    ] : null,
                    'occupied_since' => $isOccupied ? now()->subHours(rand(1, 48))->toIso8601String() : null,
                    'last_cleaned' => now()->subHours(rand(1, 24))->toIso8601String(),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $beds,
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function capacity(Request $request): JsonResponse
    {
        $departments = Service::with(['clinic'])
            ->where('beds_total', '>', 0)
            ->get()
            ->map(fn ($s) => [
                'department' => $s->name,
                'service_id' => $s->id,
                'total_beds' => $s->beds_total,
                'occupied_beds' => $s->beds_occupied,
                'available_beds' => $s->beds_total - $s->beds_occupied,
                'cleaning_beds' => 0, // TODO: table beds avec statut
                'maintenance_beds' => 0,
                'occupancy_rate' => $s->beds_total > 0 ? round(($s->beds_occupied / $s->beds_total) * 100, 2) : 0,
                'updated_at' => $s->updated_at?->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'data' => $departments,
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    /**
     * PUT /nurse/stocks/{id} — l'infirmier ajuste une quantité de stock.
     */
    public function updateStock(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['quantity' => ['required', 'numeric', 'min:0']]);

        $item = Inventory::findOrFail($id);
        $old = ['quantity' => $item->quantity, 'status' => $item->status];

        $threshold = (float) $item->alert_threshold;
        $qty = (float) $data['quantity'];
        $status = $qty <= $threshold * 0.5 ? 'critique'
            : ($qty <= $threshold ? 'alerte'
            : ($qty <= $threshold * 1.5 ? 'faible' : 'ok'));

        $item->update([
            'quantity' => $qty,
            'status' => $status,
            'last_updated_by' => $request->user()->id,
        ]);

        \App\Models\AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'update',
            'resource_type' => 'inventory',
            'resource_id' => $item->id,
            'old_values' => $old,
            'new_values' => ['quantity' => $qty, 'status' => $status],
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
            'data' => ['item_id' => $item->id, 'quantity' => $qty, 'status' => $status],
            'message' => 'Stock mis à jour.',
            'meta' => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    public function stocks(Request $request): JsonResponse
    {
        $stocks = Inventory::with(['clinic'])
            ->whereIn('status', ['faible', 'alerte', 'critique'])
            ->orWhere(function ($q) {
                $q->where('status', 'ok')
                  ->where('quantity', '<=', DB::raw('alert_threshold * 2'));
            })
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->product_name,
                'category' => 'Médicament', // TODO: champ category
                'current_quantity' => $item->quantity,
                'min_threshold' => $item->alert_threshold,
                'unit' => $item->unit,
                'status' => $item->status,
                'clinic' => $item->clinic?->name,
                'last_updated' => $item->updated_at?->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'data' => $stocks,
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function kpis(Request $request): JsonResponse
    {
        $today = now()->startOfDay();

        $vitalsRecorded = VitalSign::whereDate('created_at', today())->count();

        $patientsAdmitted = TriageEvent::where('created_at', '>=', $today)
            ->where('orientation', 'urgences')
            ->count();

        $patientsDischarged = \App\Models\Consultation::whereDate('created_at', today())
            ->whereNotNull('diagnosis')
            ->count();

        $lowStockAlerts = Inventory::whereIn('status', ['alerte', 'critique'])->count();

        $totalBeds = Service::sum('beds_total');
        $occupiedBeds = Service::sum('beds_occupied');
        $occupancyRate = $totalBeds > 0 ? round(($occupiedBeds / $totalBeds) * 100, 2) : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'kpis' => [
                    'vitals_recorded_today' => (int) $vitalsRecorded,
                    'patients_admitted_today' => (int) $patientsAdmitted,
                    'patients_discharged_today' => (int) $patientsDischarged,
                    'low_stock_alerts' => (int) $lowStockAlerts,
                    'bed_occupancy_rate' => $occupancyRate,
                ],
            ],
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }
}