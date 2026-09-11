<?php

namespace App\Providers;

use App\Models\Appointment;
use App\Models\MedicalDocument;
use App\Models\PatientRecord;
use App\Models\TriageEvent;
use App\Policies\AppointmentPolicy;
use App\Policies\MedicalDocumentPolicy;
use App\Policies\PatientRecordPolicy;
use App\Policies\TriageEventPolicy;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(PatientRecord::class, PatientRecordPolicy::class);
        Gate::policy(TriageEvent::class, TriageEventPolicy::class);
        Gate::policy(MedicalDocument::class, MedicalDocumentPolicy::class);
        Gate::policy(Appointment::class, AppointmentPolicy::class);

        // Le frontend s'authentifie aux canaux WebSocket privés avec son token
        // Sanctum (pas de session/cookie) -> guard "sanctum" sur /broadcasting/auth.
        Broadcast::routes(['middleware' => ['auth:sanctum']]);
        require base_path('routes/channels.php');
    }
}