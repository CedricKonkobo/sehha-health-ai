<?php

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        // NB: routes/channels.php + /broadcasting/auth sont enregistrés dans
        // AppServiceProvider::boot() pour pouvoir imposer le guard "sanctum".
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'encrypt.fields' => \App\Http\Middleware\EncryptSensitiveFields::class,
            'throttle.custom' => \App\Http\Middleware\RateLimitMiddleware::class,
            'audit.log' => \App\Http\Middleware\AuditLogMiddleware::class,
            'require.otp' => \App\Http\Middleware\RequireOtpForSensitiveRoles::class,
        ]);

        // En-tetes de securite HTTP sur toutes les reponses API.
        $middleware->appendToGroup('api', \App\Http\Middleware\SecurityHeaders::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Enveloppe d'erreur uniforme pour l'API : { success:false, error:{code,message[,details]}, meta }
        $exceptions->render(function (\Throwable $e, Request $request) {
            // La page HTML de vérification d'ordonnance gère ses propres erreurs.
            if ($request->routeIs('prescription.verify') && $request->isMethod('GET')) {
                return null;
            }
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            [$status, $code, $message, $details] = match (true) {
                $e instanceof ValidationException => [
                    422, 'VALIDATION_ERROR', 'Les donnees soumises sont invalides.', $e->errors(),
                ],
                $e instanceof AuthenticationException => [
                    401, 'UNAUTHENTICATED', 'Authentification requise.', null,
                ],
                $e instanceof AuthorizationException, $e instanceof AccessDeniedHttpException => [
                    403, 'FORBIDDEN', "Accès refusé à cette ressource.", null,
                ],
                $e instanceof ModelNotFoundException, $e instanceof NotFoundHttpException => [
                    404, 'NOT_FOUND', 'Ressource introuvable.', null,
                ],
                $e instanceof MethodNotAllowedHttpException => [
                    405, 'METHOD_NOT_ALLOWED', "Méthode HTTP non autorisée.", null,
                ],
                $e instanceof ThrottleRequestsException, $e instanceof TooManyRequestsHttpException => [
                    429, 'TOO_MANY_REQUESTS', 'Trop de requêtes. Veuillez réessayer plus tard.', null,
                ],
                $e instanceof HttpExceptionInterface => [
                    $e->getStatusCode(),
                    'HTTP_ERROR',
                    $e->getMessage() ?: 'Erreur HTTP.',
                    null,
                ],
                default => [
                    500,
                    'INTERNAL_ERROR',
                    config('app.debug') ? $e->getMessage() : 'Une erreur interne est survenue.',
                    null,
                ],
            };

            $error = ['code' => $code, 'message' => $message];
            if ($details !== null) {
                $error['details'] = $details;
            }

            return response()->json([
                'success' => false,
                'error' => $error,
                'meta' => [
                    'timestamp' => now()->toIso8601String(),
                    'request_id' => $request->header('X-Request-ID', (string) \Illuminate\Support\Str::uuid()),
                ],
            ], $status);
        });
    })->create();
