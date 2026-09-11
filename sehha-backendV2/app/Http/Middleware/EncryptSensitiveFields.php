<?php

namespace App\Http\Middleware;

use App\Services\EncryptionService;
use Closure;
use Illuminate\Http\Request;

class EncryptSensitiveFields
{
    private array $sensitiveFields = [
        'cin',
        'phone',
        'substance',
        'description',
    ];

    public function handle(Request $request, Closure $next): mixed
    {
        $encryption = app(EncryptionService::class);

        foreach ($this->sensitiveFields as $field) {
            if ($request->has($field)) {
                $request->merge([$field . '_encrypted' => $encryption->encrypt($request->input($field))]);
                $request->merge([$field . '_hash' => $encryption->hash($request->input($field))]);
            }
        }

        return $next($request);
    }
}