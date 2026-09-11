<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Resend;

class EmailService
{
    /**
     * Envoi d'email avec repli automatique sur le journal.
     *
     * Ordre de résolution :
     *   1. Log systématique (canal "email" -> storage/logs/email.log) — toujours,
     *      même si Resend fonctionne. Le contenu utile (code OTP, lien…) est
     *      écrit en clair sur une ligne facile à grep.
     *   2. Si MAIL_LOG_ONLY=true  OU  aucune clé Resend  -> on s'arrête là
     *      (mode démo hors-ligne : rien ne dépend du réseau).
     *   3. Sinon on tente Resend. En cas d'échec (quota, domaine non validé,
     *      réseau…) on logge l'erreur + le contenu complet et on n'échoue pas
     *      (méthode void, aucune exception propagée) : le flux de login/triage
     *      continue et l'opérateur lit le code dans le log.
     *
     * @param  array<string, mixed>  $context  Données à logger telles quelles en
     *                                         repli (ex: ['otp' => $code]) sans avoir à reparser le HTML.
     */
    public function send(string $to, string $subject, string $html, ?string $text = null, array $context = []): void
    {
        $summary = $this->contextSummary($context);

        // 1. Log systématique — ligne courte lisible pendant la démo.
        Log::channel('email')->info("[EMAIL] TO: {$to} | {$subject}".($summary !== '' ? " | {$summary}" : ''));

        $apiKey = config('services.resend.key');
        $logOnly = (bool) config('services.resend.log_only', false);

        // 2. Mode journal uniquement (choix explicite ou pas de clé).
        if ($logOnly || empty($apiKey)) {
            $reason = $logOnly ? 'MAIL_LOG_ONLY=true' : 'clé Resend absente';
            Log::channel('email')->warning("[EMAIL] Envoi simulé ({$reason}) — email NON expédié.", [
                'to' => $to,
                'subject' => $subject,
                'html' => $html,
                ...$context,
            ]);

            return;
        }

        // 3. Envoi réel via Resend, repli journal en cas d'échec.
        try {
            $resend = Resend::client($apiKey);

            $payload = [
                'from' => config('mail.from.address'),
                'to' => [$to],
                'subject' => $subject,
                'html' => $html,
            ];

            if ($text) {
                $payload['text'] = $text;
            }

            $resend->emails->send($payload);
            Log::channel('email')->info("[EMAIL] Resend OK -> {$to}");
        } catch (\Throwable $e) {
            Log::channel('email')->error("[EMAIL] Resend ÉCHEC ({$e->getMessage()}) — repli journal, code/lien ci-dessous.", [
                'to' => $to,
                'subject' => $subject,
                'html' => $html,
                ...$context,
            ]);
        }
    }

    /**
     * Transforme le contexte en résumé lisible d'une ligne pour le log info.
     * Ex: ['otp' => '123456'] -> "OTP=123456".
     */
    private function contextSummary(array $context): string
    {
        $parts = [];

        foreach ($context as $key => $value) {
            if (is_scalar($value)) {
                $parts[] = strtoupper($key).'='.$value;
            } elseif (is_array($value)) {
                $parts[] = strtoupper($key).'='.json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        }

        return implode(' | ', $parts);
    }

    public function sendOtp(string $to, string $code, int $validityMinutes = 5): void
    {
        $subject = 'SEHHA - Code de vérification';
        $html = "<p>Votre code OTP SEHHA est : <strong>{$code}</strong></p>
                 <p>Valable pendant {$validityMinutes} minutes.</p>
                 <p>Ne partagez ce code avec personne.</p>";

        $this->send($to, $subject, $html, "Code SEHHA : {$code} (valable {$validityMinutes} min)", ['otp' => $code]);
    }

    public function sendAppointmentReminder(string $to, array $details): void
    {
        $subject = 'SEHHA - Rappel de rendez-vous';
        $html = "<p>Bonjour,</p>
                 <p>Rappel : vous avez un rendez-vous le <strong>{$details['date']}</strong>
                 avec {$details['doctor']}.</p>
                 <p>Motif : {$details['motif']}</p>";

        $this->send($to, $subject, $html, null, ['appointment' => $details]);
    }

    public function sendPrescriptionLink(string $to, string $link): void
    {
        $subject = 'SEHHA - Votre ordonnance numérique';
        $html = "<p>Votre ordonnance est disponible : <a href='{$link}'>Télécharger PDF</a></p>
                 <p>Lien valable 30 jours.</p>";

        $this->send($to, $subject, $html, null, ['prescription_link' => $link]);
    }
}
