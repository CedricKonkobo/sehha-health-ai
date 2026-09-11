<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Le frontend SEHHA (Vite, http://localhost:3000) appelle l'API soit via le
    | proxy Vite (meme origine), soit directement. On autorise explicitement
    | l'origine du frontend et le endpoint d'authentification WebSocket.
    |
    */

    'paths' => ['api/*', 'broadcasting/auth', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter([
        env('FRONTEND_URL', 'http://localhost:3000'),
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ]),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
