<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicalDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'patient_id', 'created_by', 'type', 'title', 'issued_at',
        'expires_at', 'storage_path', 'qr_hash', 'structured_data',
        'extracted_text', 'ai_summary', 'source',
        'status', 'visible_to_patient',
    ];

    protected $casts = [
        'issued_at' => 'date',
        'expires_at' => 'date',
        'structured_data' => 'array',
        'visible_to_patient' => 'boolean',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}