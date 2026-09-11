<?php

namespace App\Http\Requests;

use App\Services\EncryptionService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role, ['admin', 'super_admin']);
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('cin')) {
            $this->merge(['cin_hash' => app(EncryptionService::class)->hash($this->input('cin'))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:191', 'unique:users,email'],
            'phone' => ['required', 'string', 'regex:/^(\\+212|0)[5-7][0-9]{8}$/'],
            'cin' => ['required', 'string', 'regex:/^[A-Z]{1,2}[0-9]{5,6}$/'],
            'cin_hash' => [Rule::unique('users', 'cin_hash')],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:infirmier,medecin,admin'],
            'speciality' => ['required_if:role,medecin', 'in:medecine_generale,cardiologie,pediatrie,urgentiste,maternite,chirurgie'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'clinic_id' => ['nullable', 'integer', 'exists:clinics,id'],
        ];
    }
}
