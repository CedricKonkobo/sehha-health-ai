<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAllergyRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Le controle de role est fait par le middleware "role:" sur la route.
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'substance' => ['required', 'string', 'max:200'],
            'severity' => ['required', 'in:mild,moderate,severe,anaphylactic'],
            'reaction_description' => ['nullable', 'string', 'max:1000'],
            'discovered_at' => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }
}