<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TriageAlert implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public array $triageData,
        public User $patient
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('triage.queue'),
            new PrivateChannel('triage.p1.alert'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'triage.alert';
    }

    public function broadcastWith(): array
    {
        return [
            'patient_uuid' => $this->patient->uuid,
            'patient_name' => $this->patient->name,
            'ia_score' => $this->triageData['ia_score'] ?? null,
            'ccmu_score' => $this->triageData['ccmu_score'] ?? null,
            'orientation' => $this->triageData['orientation'] ?? null,
            'recommended_delay' => $this->triageData['recommended_delay'] ?? null,
            'red_flags' => $this->triageData['red_flags'] ?? [],
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
