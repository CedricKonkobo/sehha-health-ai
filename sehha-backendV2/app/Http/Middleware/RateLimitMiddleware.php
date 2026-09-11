<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class RateLimitMiddleware
{
    public function handle(Request $request, Closure $next, string $maxAttempts = '60', string $decayMinutes = '1'): mixed
    {
        // Cle par (chemin de route + limite + IP) : les buckets "auth" (5-20/min)
        // et "API" (60/min) ne se partagent plus le meme compteur.
        $routeSignature = optional($request->route())->uri() ?? $request->path();
        $key = sha1($routeSignature.'|'.$maxAttempts.'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($key, (int) $maxAttempts)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'TOO_MANY_REQUESTS',
                    'message' => 'Trop de requetes. Veuillez reessayer plus tard.',
                ],
                'meta' => ['timestamp' => now()->toIso8601String()],
            ], 429);
        }

        RateLimiter::hit($key, (int) $decayMinutes * 60);

        return $next($request);
    }
}
