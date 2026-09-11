<?php

namespace App\Events;

use App\Models\Inventory;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InventoryAlert implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Inventory $item) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('inventory.alerts')];
    }

    public function broadcastAs(): string
    {
        return 'inventory.alert';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->item->id,
            'product_name' => $this->item->product_name,
            'quantity' => $this->item->quantity,
            'unit' => $this->item->unit,
            'status' => $this->item->status,
            'clinic' => $this->item->clinic?->name,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
