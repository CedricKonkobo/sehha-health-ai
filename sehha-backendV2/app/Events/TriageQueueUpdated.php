<?php

namespace App\Events;

use App\Models\TriageEvent;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Diffusé à chaque création OU validation d'un triage (tous scores confondus)
 * pour que la file de triage des soignants se rafraîchisse en direct.
 */
class TriageQueueUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public TriageEvent $triage) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('triage.queue')];
    }

    public function broadcastAs(): string
    {
        return 'triage.queue.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'triage_uuid' => $this->triage->uuid,
            'ia_score' => $this->triage->ia_score,
            'human_validated' => (bool) $this->triage->human_validated,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
