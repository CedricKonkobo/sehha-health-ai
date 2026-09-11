<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;

class AuditLogMiddleware
{
    /**
     * Correspondance HTTP method → valeur autorisée par le CHECK constraint
     * de audit_logs.action : ['create','read','update','delete','login','logout','export']
     *
     * Le middleware générique ne connaît pas la sémantique métier (c'est le
     * rôle des appels AuditLog::create() dans les controllers). Il trace
     * uniquement l'action HTTP au niveau transport, mappée sur les valeurs
     * acceptées par la contrainte PostgreSQL.
     */
    private const METHOD_TO_ACTION = [
        'POST'   => 'create',
        'GET'    => 'read',
        'PUT'    => 'update',
        'PATCH'  => 'update',
        'DELETE' => 'delete',
    ];

    public function handle(Request $request, Closure $next): mixed
    {
        $response = $next($request);

        $user   = $request->user();
        $method = strtoupper($request->method());

        // On ne logue que les méthodes d'écriture (GET génère trop de bruit
        // et n'apporte pas de valeur dans l'audit trail)
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE']) && $user) {
            $action = self::METHOD_TO_ACTION[$method] ?? 'update';

            // Exclure les champs sensibles du payload loggé
            $payload = $request->except([
                'password', 'otp', 'audio', 'image',
                'current_password', 'new_password', 'new_password_confirmation',
            ]);

            try {
                AuditLog::create([
                    'user_id'       => $user->id,
                    'action'        => $action,
                    'resource_type' => substr($request->path(), 0, 80), // max 80 chars (colonne string 80)
                    'resource_id'   => null,
                    'old_values'    => null,
                    'new_values'    => empty($payload) ? null : $payload,
                    'ip_address'    => $request->ip(),
                    'user_agent'    => $request->userAgent(),
                    'timestamp'     => now(),
                ]);
            } catch (\Throwable $e) {
                // L'audit ne doit JAMAIS faire échouer la requête métier.
                // On logue l'erreur en silence et on laisse la réponse passer.
                \Illuminate\Support\Facades\Log::error('AuditLogMiddleware failed', [
                    'error' => $e->getMessage(),
                    'path'  => $request->path(),
                ]);
            }
        }

        return $response;
    }
}
