<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Raccourci démo : affiche le dernier code OTP écrit dans storage/logs/email.log.
 *
 *   php artisan otp:last            -> dernier OTP tous comptes confondus
 *   php artisan otp:last ali        -> dernier OTP dont la ligne contient "ali"
 *   php artisan otp:last --watch    -> rafraîchit toutes les 2 s (Ctrl+C pour sortir)
 */
class ShowLastOtp extends Command
{
    protected $signature = 'otp:last {filter? : Sous-chaîne à chercher (email, nom…)} {--watch : Rafraîchir en continu}';

    protected $description = 'Affiche le dernier code OTP présent dans storage/logs/email.log';

    public function handle(): int
    {
        $path = storage_path('logs/email.log');

        if (! is_file($path)) {
            $this->error("Fichier introuvable : {$path}");
            $this->line('Aucun email n\'a encore été envoyé (lance un login soignant d\'abord).');

            return self::FAILURE;
        }

        do {
            $hit = $this->findLastOtp($path, $this->argument('filter'));

            if ($this->option('watch')) {
                $this->output->write("\033[2J\033[H"); // clear screen
                $this->line('<comment>otp:last --watch</comment> (Ctrl+C pour quitter) — '.now()->format('H:i:s'));
                $this->newLine();
            }

            if ($hit === null) {
                $this->warn('Aucun OTP trouvé'.($this->argument('filter') ? " pour « {$this->argument('filter')} »" : '').'.');
            } else {
                $this->info("OTP   : {$hit['otp']}");
                $this->line("Ligne : {$hit['line']}");
            }

            if ($this->option('watch')) {
                sleep(2);
            }
        } while ($this->option('watch'));

        return self::SUCCESS;
    }

    /**
     * @return array{otp: string, line: string}|null
     */
    private function findLastOtp(string $path, ?string $filter): ?array
    {
        $lines = array_reverse(file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []);

        foreach ($lines as $line) {
            if ($filter && stripos($line, $filter) === false) {
                continue;
            }

            // Formats possibles : "OTP=123456" (résumé) ou '"otp":"123456"' (contexte JSON).
            if (preg_match('/OTP[=:"\s]+(\d{4,8})/i', $line, $m)) {
                return ['otp' => $m[1], 'line' => trim($line)];
            }
        }

        return null;
    }
}
