<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
        // MAIL_LOG_ONLY=true -> EmailService n'appelle jamais Resend, il écrit
        // seulement dans storage/logs/email.log. Utile pour une démo sans réseau
        // ou tant que le domaine d'envoi n'est pas validé.
        'log_only' => env('MAIL_LOG_ONLY', false),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'triage_ia' => [
        'url' => env('TRIAGE_IA_URL'),
        'token' => env('TRIAGE_IA_TOKEN'),
    ],

    'ocr' => [
        'url' => env('OCR_API_URL'),
        'key' => env('OCR_API_KEY'),
    ],

    'speech_to_text' => [
        'url' => env('SPEECH_TO_TEXT_URL'),
        'key' => env('SPEECH_TO_TEXT_KEY'),
    ],

    'llm' => [
        'url' => env('LLM_API_URL'),
        'key' => env('LLM_API_KEY'),
    ],

];
