<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\OtpController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - SEHHA v1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // === AUTH (Public / Throttle strict) ===
    Route::middleware('throttle.custom:20,1')->group(function () {
        Route::post('/auth/register', [AuthController::class, 'register']);
        Route::post('/auth/login', [AuthController::class, 'login']);
        Route::post('/auth/otp/request', [OtpController::class, 'requestOtp']);
        Route::post('/auth/otp/verify', [OtpController::class, 'verifyOtp']);
    });

    Route::post('/auth/password/reset', [AuthController::class, 'passwordReset']);

    // === AUTH (Authentifié) ===
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/refresh', [AuthController::class, 'refresh']);
        Route::get('/auth/me', [AuthController::class, 'me']);
    });

    // === PROTECTED ROUTES (Sanctum + OTP pour soignants) ===
    Route::middleware(['auth:sanctum', 'require.otp', 'throttle.custom:60,1'])->group(function () {

        // --- Triage : soignants (segments statiques AVANT le wildcard {uuid}) ---
        Route::middleware('role:infirmier,medecin,admin,super_admin')->group(function () {
            Route::get('/triage/queue', [\App\Http\Controllers\Patient\TriageController::class, 'queue']);
            Route::get('/triage/stats', [\App\Http\Controllers\Patient\TriageController::class, 'stats']);
            Route::put('/triage/{uuid}/validate', [\App\Http\Controllers\Patient\TriageController::class, 'validate']);
        });

        // --- Triage : patient + soignants ---
        Route::middleware('role:patient,medecin,infirmier,admin,super_admin')->group(function () {
            Route::post('/triage', [\App\Http\Controllers\Patient\TriageController::class, 'store']);
            Route::post('/triage/answer', [\App\Http\Controllers\Patient\TriageChatbotController::class, 'answer']);
            Route::get('/triage/history',        [\App\Http\Controllers\Patient\TriageController::class, 'myHistory']);
            Route::get('/triage/patient/{uuid}',  [\App\Http\Controllers\Patient\TriageController::class, 'history']);
            Route::get('/triage/{uuid}', [\App\Http\Controllers\Patient\TriageController::class, 'show'])
                ->where('uuid', '[0-9a-fA-F-]{36}');
        });

        // --- Patient (own data, lecture seule DME) ---
        Route::middleware('role:patient')->group(function () {
            Route::get('/patients/me/dme',           [\App\Http\Controllers\Patient\PatientController::class, 'myDme']);
            Route::get('/patients/me/consultations', [\App\Http\Controllers\Patient\PatientController::class, 'myConsultations']);
            Route::get('/patients/me/vitals',        [\App\Http\Controllers\Patient\PatientController::class, 'myVitals']);
            Route::get('/patients/me/documents',     [\App\Http\Controllers\Patient\PatientController::class, 'myDocuments']);
        });

        // Mise à jour de ses propres coordonnées / mot de passe : tout rôle.
        Route::put('/patients/me/profile', [\App\Http\Controllers\Patient\PatientController::class, 'updateProfile']);

        // --- Soignant : DME en lecture + constantes (infirmier RW sur les
        // constantes, cf. spec DME "l'infirmier met à jour les constantes") ---
        // audit.log activé: toute écriture DME doit être tracée.
        Route::middleware(['role:infirmier,medecin,admin,super_admin', 'audit.log'])->group(function () {
            Route::get('/patients/{uuid}/dme', [\App\Http\Controllers\Doctor\DmeController::class, 'show']);
            Route::get('/patients/{uuid}/consultations', [\App\Http\Controllers\Doctor\DmeController::class, 'consultations']);
            Route::get('/patients/{uuid}/vitals', [\App\Http\Controllers\Doctor\DmeController::class, 'vitals']);
            Route::post('/patients/{uuid}/vitals', [\App\Http\Controllers\Doctor\DmeController::class, 'storeVital']);
            Route::get('/patients/{uuid}/allergies', [\App\Http\Controllers\Doctor\DmeController::class, 'allergies']);
        });

        // --- Médecin : écritures cliniques (consultation, allergie, ordonnance) ---
        Route::middleware(['role:medecin,admin,super_admin', 'audit.log'])->group(function () {
            Route::post('/patients/{uuid}/consultations', [\App\Http\Controllers\Doctor\DmeController::class, 'storeConsultation']);
            Route::post('/patients/{uuid}/consultations/dictate', [\App\Http\Controllers\Doctor\DmeController::class, 'dictateConsultationReport']);
            Route::post('/patients/{uuid}/allergies', [\App\Http\Controllers\Doctor\DmeController::class, 'storeAllergy']);

            Route::post('/prescriptions', [\App\Http\Controllers\Doctor\PrescriptionController::class, 'store']);
            Route::post('/prescriptions/dictate', [\App\Http\Controllers\Doctor\PrescriptionController::class, 'dictate']);
        });

        // Historique + PDF des ordonnances -- consultable par le patient
        // lui-même (le contrôleur vérifie l'appartenance) et par le médecin.
        Route::middleware('role:patient,medecin,admin,super_admin')->group(function () {
            Route::get('/patients/{uuid}/prescriptions', [\App\Http\Controllers\Doctor\PrescriptionController::class, 'history']);
            Route::get('/prescriptions/{uuid}/pdf', [\App\Http\Controllers\Doctor\PrescriptionController::class, 'pdf']);
        });

        

        // --- RDV ---
        Route::middleware('role:patient,medecin,admin,super_admin')->group(function () {
            Route::get('/appointments/slots', [\App\Http\Controllers\Patient\AppointmentController::class, 'slots']);
            Route::get('/appointments/slots/ia-suggest', [\App\Http\Controllers\Patient\AppointmentController::class, 'iaSuggest']);
            Route::post('/appointments', [\App\Http\Controllers\Patient\AppointmentController::class, 'store']);
            Route::get('/appointments', [\App\Http\Controllers\Patient\AppointmentController::class, 'index']);
            Route::get('/appointments/doctors', [\App\Http\Controllers\Patient\AppointmentController::class, 'doctors']);
            Route::get('/appointments/{uuid}', [\App\Http\Controllers\Patient\AppointmentController::class, 'show']);
            Route::put('/appointments/{uuid}', [\App\Http\Controllers\Patient\AppointmentController::class, 'update']);
            Route::delete('/appointments/{uuid}', [\App\Http\Controllers\Patient\AppointmentController::class, 'destroy']);
        });

        // --- Agenda & Dashboard Médecin ---
        Route::middleware('role:medecin,admin,super_admin')->group(function () {
            Route::get('/doctor/{uuid}/agenda', [\App\Http\Controllers\Doctor\AgendaController::class, 'show']);
            Route::get('/doctor/dashboard/kpis', [\App\Http\Controllers\Doctor\DashboardController::class, 'kpis']);
        });

        // --- Documents ---
        Route::middleware('role:patient,medecin,infirmier,admin,super_admin')->group(function () {
            Route::get('/documents', [\App\Http\Controllers\Shared\DocumentController::class, 'index']);
            Route::get('/documents/{uuid}', [\App\Http\Controllers\Shared\DocumentController::class, 'show']);
        });

        // OCR (scan documents) et Speech-to-Text : ouverts au patient (scan
        // de ses propres documents) et au médecin (dictée + scan pour un
        // patient qu'il consulte).
        Route::middleware('role:patient,medecin,infirmier')->group(function () {
            Route::post('/ocr/scan', [\App\Http\Controllers\Shared\DocumentController::class, 'scan']);
            Route::post('/speech-to-text', [\App\Http\Controllers\Shared\DocumentController::class, 'transcribe']);
        });

        // --- Admin ---
        Route::middleware('role:admin,super_admin')->group(function () {
            Route::get('/admin/users', [\App\Http\Controllers\Admin\AdminController::class, 'users']);
            Route::post('/admin/users', [\App\Http\Controllers\Admin\AdminController::class, 'createUser']);
            Route::delete('/admin/users/{uuid}', [\App\Http\Controllers\Admin\AdminController::class, 'disableUser']);
            Route::get('/admin/inventory', [\App\Http\Controllers\Admin\AdminController::class, 'inventory']);
            Route::put('/admin/inventory/{id}', [\App\Http\Controllers\Admin\AdminController::class, 'updateInventory'])->whereNumber('id');
            Route::get('/admin/equipment', [\App\Http\Controllers\Admin\AdminController::class, 'equipment']);
            Route::get('/admin/stats/kpis', [\App\Http\Controllers\Admin\AdminController::class, 'kpis']);
            Route::get('/admin/audit-logs', [\App\Http\Controllers\Admin\AdminController::class, 'auditLogs']);
            Route::put('/admin/users/{uuid}', [\App\Http\Controllers\Admin\AdminController::class, 'updateUser']);
            Route::put('/admin/users/{uuid}/role', [\App\Http\Controllers\Admin\AdminController::class, 'updateRole']);
            Route::put('/admin/users/{uuid}/status', [\App\Http\Controllers\Admin\AdminController::class, 'updateStatus']);
            Route::post('/admin/inventory/{id}/restock', [\App\Http\Controllers\Admin\AdminController::class, 'restock'])->whereNumber('id');
        });

        // --- Infirmier ---
        Route::middleware('role:infirmier,admin,super_admin')->group(function () {
            Route::get('/nurse/beds', [\App\Http\Controllers\Admin\NurseController::class, 'beds']);
            Route::get('/nurse/capacity', [\App\Http\Controllers\Admin\NurseController::class, 'capacity']);
            Route::get('/nurse/stocks', [\App\Http\Controllers\Admin\NurseController::class, 'stocks']);
            Route::put('/nurse/stocks/{id}', [\App\Http\Controllers\Admin\NurseController::class, 'updateStock'])->whereNumber('id');
            Route::get('/nurse/dashboard/kpis', [\App\Http\Controllers\Admin\NurseController::class, 'kpis']);
            Route::put('/nurse/capacity', [\App\Http\Controllers\Admin\NurseController::class, 'updateCapacity']);
        });

    });

    // === Public (QR Verify) ===
    // GET : page HTML "valide / invalide" (le QR code de l'ordonnance pointe ici,
    //       scannable directement au téléphone). POST : API JSON pour le front.
    Route::get('/prescriptions/verify', [\App\Http\Controllers\Doctor\PrescriptionController::class, 'verifyPage'])
        ->name('prescription.verify');
    Route::post('/prescriptions/verify', [\App\Http\Controllers\Doctor\PrescriptionController::class, 'verify']);

});