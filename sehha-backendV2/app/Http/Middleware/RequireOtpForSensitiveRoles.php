<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireOtpForSensitiveRoles
{
    private array $sensitiveRoles = ['medecin', 'infirmier', 'admin', 'super_admin'];

    public function handle(Request $request, Closure $next): mixed
    {
        $user = $request->user();

        if ($user && in_array($user->role, $this->sensitiveRoles)) {
            $otpVerifiedAt = $user->last_login_at;

            if (!$otpVerifiedAt || $otpVerifiedAt->lt(now()->subHours(8))) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'OTP_REQUIRED',
                        'message' => 'Vérification OTP requise pour ce rôle. Veuillez valider votre OTP.'
                    ],
                    'meta' => ['timestamp' => now()->toIso8601String()]
                ], 401);
            }
        }

        return $next($request);
    }
}