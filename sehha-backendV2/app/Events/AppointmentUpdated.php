<?php

namespace App\Events;

use App\Models\Appointment;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AppointmentUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Appointment $appointment) {}

    public function broadcastOn(): array
    {
        $this->appointment->loadMissing(['patient', 'doctor']);

        return [
            new PrivateChannel('patient.'.$this->appointment->patient?->uuid),
            new PrivateChannel('doctor.'.$this->appointment->doctor?->uuid.'.agenda'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'appointment.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'appointment_uuid' => $this->appointment->uuid,
            'status' => $this->appointment->status,
            'starts_at' => $this->appointment->starts_at?->toIso8601String(),
            'doctor_name' => $this->appointment->doctor?->name,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
