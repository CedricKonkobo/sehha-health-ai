<?php

namespace App\Events;

use App\Models\Service;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BedsCapacityUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Service $service) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('beds.capacity')];
    }

    public function broadcastAs(): string
    {
        return 'beds.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'service_id' => $this->service->id,
            'service_name' => $this->service->name,
            'beds_total' => $this->service->beds_total,
            'beds_occupied' => $this->service->beds_occupied,
            'beds_available' => $this->service->beds_total - $this->service->beds_occupied,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
