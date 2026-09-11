<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\OtpRequest;
use App\Http\Requests\VerifyOtpRequest;
use App\Models\User;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class OtpController extends Controller
{
    public function __construct(
        private EmailService $email
    ) {}

    public function requestOtp(OtpRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Utilisateur non trouvé.'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 404);
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->update(['otp_secret' => Hash::make($otp)]);

        $this->email->sendOtp($user->email, $otp);

        return response()->json([
            'success' => true,
            'data' => ['otp_sent' => true],
            'message' => 'OTP envoyé.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->otp, $user->otp_secret)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'UNAUTHENTICATED', 'message' => 'OTP invalide.'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 401);
        }

        // Nettoyage OTP + activation session
        $user->update([
            'otp_secret' => null,
            'last_login_at' => now(),
            'failed_attempts' => 0,
        ]);

        $token = $user->createToken('web-dashboard', ['*'])->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => 28800, // 8h
                'user' => [
                    'uuid' => $user->uuid,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
            ],
            'message' => 'OTP validé. Connexion établie.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }
}