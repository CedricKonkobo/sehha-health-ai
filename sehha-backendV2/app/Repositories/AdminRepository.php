<?php

namespace App\Repositories;

use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Inventory;
use App\Models\TriageEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AdminRepository
{
    public function getKpis(?int $clinicId = null, ?string $period = 'today'): array
    {
        $dateFilter = match($period) {
            'today' => now()->startOfDay(),
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            default => now()->startOfDay(),
        };

        // Taux d'occupation lits
        $bedQuery = \App\Models\Service::query();
        if ($clinicId) {
            $bedQuery->where('clinic_id', $clinicId);
        }
        $totalBeds = $bedQuery->sum('beds_total');
        $occupiedBeds = $bedQuery->sum('beds_occupied');
        $occupationRate = $totalBeds > 0 ? round(($occupiedBeds / $totalBeds) * 100, 2) : 0;

        // Temps d'attente moyen
        $avgWait = TriageEvent::whereNotNull('wait_time_minutes')
            ->where('created_at', '>=', $dateFilter)
            ->avg('wait_time_minutes');

        // Taux de réorientation
        $totalTriages = TriageEvent::where('created_at', '>=', $dateFilter)->count();
        $reoriented = TriageEvent::where('created_at', '>=', $dateFilter)
            ->where('human_validated', true)
            ->whereColumn('ia_score', '!=', 'final_outcome') // approximation
            ->count();

        // RDV stats
        $rdvStats = Appointment::where('created_at', '>=', $dateFilter)
            ->selectRaw("status, COUNT(*) as count")
            ->groupBy('status')
            ->pluck('count', 'status');

        // Cas P1 du jour
        $p1Today = TriageEvent::whereDate('created_at', today())
            ->where('ia_score', 'P1')
            ->count();

        return [
            'period' => $period,
            'taux_occupation_lits' => [
                'percentage' => $occupationRate,
                'total_beds' => $totalBeds,
                'occupied_beds' => $occupiedBeds,
            ],
            'temps_attente_moyen_minutes' => round($avgWait ?? 0, 2),
            'taux_reorientation' => [
                'percentage' => $totalTriages > 0 ? round(($reoriented / $totalTriages) * 100, 2) : 0,
                'total' => $totalTriages,
                'reoriented' => $reoriented,
            ],
            'rdv_stats' => [
                'confirmed' => $rdvStats['confirmed'] ?? 0,
                'completed' => $rdvStats['completed'] ?? 0,
                'cancelled' => $rdvStats['cancelled'] ?? 0,
                'no_show' => $rdvStats['no_show'] ?? 0,
                'pending' => $rdvStats['pending'] ?? 0,
            ],
            'cas_p1_aujourdhui' => $p1Today,
            'flux_patients' => [
                'triages' => TriageEvent::where('created_at', '>=', $dateFilter)->count(),
                'consultations' => \App\Models\Consultation::where('created_at', '>=', $dateFilter)->count(),
                'ordonnances' => \App\Models\MedicalDocument::where('type', 'ordonnance')
                    ->where('created_at', '>=', $dateFilter)->count(),
            ],
        ];
    }

    public function getAuditLogs(array $filters = [], int $perPage = 50)
    {
        $query = AuditLog::with('user')
            ->orderBy('timestamp', 'desc');

        if (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }
        if (!empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }
        if (!empty($filters['resource_type'])) {
            $query->where('resource_type', 'like', '%' . $filters['resource_type'] . '%');
        }
        if (!empty($filters['date_from'])) {
            $query->where('timestamp', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('timestamp', '<=', $filters['date_to']);
        }

        return $query->paginate($perPage);
    }

    public function getInventoryStatus(?int $clinicId = null): array
    {
        $query = Inventory::with(['clinic', 'lastUpdatedBy']);

        if ($clinicId) {
            $query->where('clinic_id', $clinicId);
        }

        $items = $query->get();

        return [
            'total_items' => $items->count(),
            'by_status' => [
                'ok' => $items->where('status', 'ok')->count(),
                'faible' => $items->where('status', 'faible')->count(),
                'alerte' => $items->where('status', 'alerte')->count(),
                'critique' => $items->where('status', 'critique')->count(),
            ],
            'items' => $items->map(fn ($item) => [
                'id' => $item->id,
                'product_name' => $item->product_name,
                'quantity' => $item->quantity,
                'unit' => $item->unit,
                'alert_threshold' => $item->alert_threshold,
                'status' => $item->status,
                'clinic' => $item->clinic?->name,
                'last_updated' => $item->updated_at?->toIso8601String(),
                'last_updated_by' => $item->lastUpdatedBy?->name,
            ]),
        ];
    }
}