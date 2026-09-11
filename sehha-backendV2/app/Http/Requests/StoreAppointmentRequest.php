<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role, ['patient', 'medecin', 'admin', 'super_admin']);
    }

    public function rules(): array
    {
        return [
            'doctor_uuid' => ['required', 'uuid', 'exists:users,uuid'],
            'starts_at' => ['required', 'date', 'after:now'],
            'motif' => ['required', 'string', 'max:500'],
            'triage_uuid' => ['nullable', 'uuid', 'exists:triage_events,uuid'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'starts_at.after' => 'Le créneau doit être dans le futur.',
            'doctor_uuid.exists' => 'Médecin non trouvé.',
        ];
    }
}