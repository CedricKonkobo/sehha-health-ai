<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Canaux WebSocket privés (Laravel Reverb)
|--------------------------------------------------------------------------
| Authentifiés via /broadcasting/auth (guard sanctum, cf. AppServiceProvider).
| Les noms de canaux correspondent à App\Events\*::broadcastOn().
*/

$soignants = ['infirmier', 'medecin', 'admin', 'super_admin'];

Broadcast::channel('triage.queue', fn ($user) => in_array($user->role, $soignants, true));

Broadcast::channel('triage.p1.alert', fn ($user) => in_array($user->role, $soignants, true));

Broadcast::channel('inventory.alerts', fn ($user) => in_array($user->role, ['infirmier', 'admin', 'super_admin'], true));

Broadcast::channel('beds.capacity', fn ($user) => in_array($user->role, ['infirmier', 'admin', 'super_admin'], true));

// Canaux scopés à un utilisateur : on compare l'UUID public.
Broadcast::channel('patient.{uuid}', fn ($user, string $uuid) => $user->uuid === $uuid);

Broadcast::channel('doctor.{uuid}.agenda', fn ($user, string $uuid) => $user->uuid === $uuid
    || in_array($user->role, ['admin', 'super_admin'], true));
