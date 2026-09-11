<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreConsultationRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Le controle de role est fait par le middleware "role:" sur la route.
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'motif' => ['required', 'string', 'max:1000'],
            'symptoms_notes' => ['nullable', 'string', 'max:5000'],
            'diagnosis' => ['required', 'string', 'max:2000'],
            'icd10_code' => ['nullable', 'string', 'max:10'],
            'treatment' => ['nullable', 'string', 'max:3000'],
            'exams_requested' => ['nullable', 'array'],
            'vitals_at_visit' => ['nullable', 'array'],
            'report_text' => ['nullable', 'string', 'max:8000'],
            'follow_up_required' => ['boolean'],
            'follow_up_date' => ['nullable', 'date', 'after:today'],
            'consultation_date' => ['nullable', 'date'],
        ];
    }
}