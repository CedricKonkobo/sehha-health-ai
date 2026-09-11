<?php

namespace App\Services;

class EncryptionService
{
    private string $key;
    private string $cipher;

    public function __construct()
    {
        $this->key = hex2bin(config('encryption.key'));
        $this->cipher = config('encryption.cipher', 'aes-256-gcm');
    }

    public function encrypt(?string $value): ?string
    {
        if ($value === null) return null;

        $iv = random_bytes(12);
        $tag = '';
        $encrypted = openssl_encrypt($value, $this->cipher, $this->key, OPENSSL_RAW_DATA, $iv, $tag, '', 16);

        if ($encrypted === false) {
            throw new \RuntimeException('Encryption failed');
        }

        return base64_encode($iv . $tag . $encrypted);
    }

    public function decrypt(?string $payload): ?string
    {
        if ($payload === null) return null;

        $data = base64_decode($payload);
        $iv = substr($data, 0, 12);
        $tag = substr($data, 12, 16);
        $ciphertext = substr($data, 28);

        $decrypted = openssl_decrypt($ciphertext, $this->cipher, $this->key, OPENSSL_RAW_DATA, $iv, $tag);

        if ($decrypted === false) {
            throw new \RuntimeException('Decryption failed');
        }

        return $decrypted;
    }

    public function hash(string $value): string
    {
        return hash('sha256', $value);
    }
}