<?php

namespace App\Http\Requests;

use App\Services\EncryptionService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * L'inscription publique ne crée QUE des patients — jamais de compte
     * soignant/admin (ceux-ci sont créés via /admin/users).
     */
    protected function prepareForValidation(): void
    {
        $this->merge(['role' => 'patient']);

        if ($this->filled('cin')) {
            $this->merge(['cin_hash' => app(EncryptionService::class)->hash($this->input('cin'))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['nullable', 'email:rfc', 'max:191', 'unique:users,email'],
            'phone' => ['required', 'string', 'regex:/^(\\+212|0)[5-7][0-9]{8}$/'],
            'cin' => ['required', 'string', 'regex:/^[A-Z]{1,2}[0-9]{5,6}$/'],
            'cin_hash' => [Rule::unique('users', 'cin_hash')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Le numéro de téléphone doit être un numéro marocain valide.',
            'cin.regex' => 'Le CIN doit être au format marocain valide (ex: AB123456).',
            'cin_hash.unique' => 'Ce CIN est déjà enregistré.',
        ];
    }
}