<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTriageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && (
            $user->role === 'patient'
            || in_array($user->role, ['infirmier', 'medecin'])
        );
    }

    public function rules(): array
    {
        return [
            'symptoms' => ['required', 'array'],
            'symptoms.chief_complaint' => ['required', 'string', 'max:500', 'regex:/^[\pL\s\-]+$/u'],
            'symptoms.irradiation' => ['nullable', 'string', 'max:100'],
            'symptoms.onset_hours' => ['nullable', 'integer', 'min:0', 'max:720'],
            'symptoms.severity_eva' => ['required', 'integer', 'min:0', 'max:10'],
            'symptoms.dyspnea' => ['required', 'boolean'],
            'symptoms.sweating' => ['required', 'boolean'],
            'symptoms.loss_of_consciousness' => ['required', 'boolean'],
            'symptoms.fever' => ['required', 'boolean'],
            'symptoms.temperature' => ['nullable', 'numeric', 'min:30', 'max:45'],
            'patient_context' => ['required', 'array'],
            'patient_context.age' => ['required', 'integer', 'min:0', 'max:130'],
            'patient_context.known_conditions' => ['nullable', 'array', 'max:20'],
            'patient_context.current_medications' => ['nullable', 'array', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'symptoms.chief_complaint.regex' => 'Le motif principal contient des caractères non autorisés.',
            'symptoms.severity_eva.max' => 'L\'échelle de douleur EVA doit être entre 0 et 10.',
        ];
    }
}