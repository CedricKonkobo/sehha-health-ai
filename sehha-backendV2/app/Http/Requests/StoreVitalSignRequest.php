<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVitalSignRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Le controle de role est fait par le middleware "role:" sur la route.
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'in:tension_sys,tension_dia,heart_rate,spo2,temperature,glycemia,weight,respiratory_rate'],
            'value' => ['required', 'numeric', 'min:0', 'max:999'],
            'value_2' => ['nullable', 'numeric', 'min:0', 'max:999'],
            'unit' => ['required', 'string', 'max:15'],
            'measured_at' => ['nullable', 'date'],
            'source' => ['in:medical_device,wearable,self_reported'],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }
}