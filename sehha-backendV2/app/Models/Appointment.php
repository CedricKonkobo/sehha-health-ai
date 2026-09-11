<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'patient_id', 'doctor_id', 'service_id', 'starts_at', 'ends_at',
        'status', 'ia_suggested', 'motif', 'triage_id', 'sms_reminder_sent', 'queue_number',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'ia_suggested' => 'boolean',
        'sms_reminder_sent' => 'boolean',
        'queue_number' => 'integer',
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

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_id');
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function triage()
    {
        return $this->belongsTo(TriageEvent::class, 'triage_id');
    }

    public function consultation()
    {
        return $this->hasOne(Consultation::class);
    }
}