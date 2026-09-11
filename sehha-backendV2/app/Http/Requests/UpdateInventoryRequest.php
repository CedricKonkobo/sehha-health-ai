<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInventoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role, ['admin', 'super_admin']);
    }

    public function rules(): array
    {
        return [
            'quantity' => ['required', 'numeric', 'min:0'],
            'alert_threshold' => ['required', 'numeric', 'min:0'],
        ];
    }
}