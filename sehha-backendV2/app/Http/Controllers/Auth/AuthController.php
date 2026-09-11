<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\User;
use App\Services\EmailService;
use App\Services\EncryptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(
        private EncryptionService $encryption,
        private EmailService $email
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'uuid' => (string) Str::uuid(),
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'phone_encrypted' => $this->encryption->encrypt($data['phone']),
            'cin_hash' => $this->encryption->hash($data['cin']),
            'cin_encrypted' => $this->encryption->encrypt($data['cin']),
            'password' => Hash::make($data['password']),
            'role' => 'patient', // l'inscription publique ne crée que des patients
            'is_active' => true,
            'failed_attempts' => 0,
        ]);

        // Envoi OTP pour activation
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->update(['otp_secret' => Hash::make($otp)]);
        $this->email->sendOtp($data['email'] ?? $data['phone'] . '@placeholder.sehha', $otp);

        return response()->json([
            'success' => true,
            'data' => ['user_uuid' => $user->uuid, 'otp_sent' => true],
            'message' => 'Inscription réussie. Veuillez vérifier votre OTP.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::where('email', $data['email'] ?? '')
            ->orWhere('cin_hash', $this->encryption->hash($data['cin'] ?? ''))
            ->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UNAUTHENTICATED',
                    'message' => 'Identifiants invalides.'
                ],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'ACCOUNT_LOCKED',
                    'message' => 'Compte désactivé.'
                ],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 423);
        }

        // Soignant -> OTP obligatoire
        if (in_array($user->role, ['medecin', 'infirmier', 'admin', 'super_admin'])) {
            $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $user->update([
                'otp_secret' => Hash::make($otp),
                'last_login_at' => null,
            ]);

            $this->email->sendOtp($user->email ?? 'admin@sehha.ma', $otp);

            return response()->json([
                'success' => true,
                'data' => [
                    'otp_required' => true,
                    'otp_sent' => true,
                    // Renvoyé pour que le frontend puisse enchaîner sur /otp
                    // même après un login par CIN (verifyOtp identifie par email).
                    'email' => $user->email,
                ],
                'message' => 'OTP envoyé. Veuillez valider le code pour continuer.',
                'meta' => ['timestamp' => now()->toIso8601String()]
            ]);
        }

        // Patient -> token direct
        $token = $user->createToken('mobile-app', ['*'])->plainTextToken;

        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
            'failed_attempts' => 0,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => 604800, // 7 jours
                'user' => $this->userResponse($user),
            ],
            'message' => 'Connexion réussie.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Déconnexion réussie.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

        $token = $user->createToken('mobile-app', ['*'])->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => 604800,
            ],
            'message' => 'Token rafraîchi.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->userResponse($request->user()),
            'message' => 'Profil utilisateur.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function passwordReset(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if ($user) {
            $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $user->update(['otp_secret' => Hash::make($otp)]);
            $this->email->sendOtp($user->email, $otp, 10);
        }

        // Réponse identique que l'email existe ou non (anti-énumération)
        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Si cet email existe, un code de réinitialisation a été envoyé.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    private function userResponse(User $user): array
    {
        return [
            'uuid' => $user->uuid,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at?->toIso8601String(),
        ];
    }
}