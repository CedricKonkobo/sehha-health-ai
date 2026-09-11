<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required_without:cin', 'email'],
            'cin' => ['required_without:email', 'string'],
            'password' => ['required', 'string'],
        ];
    }
}