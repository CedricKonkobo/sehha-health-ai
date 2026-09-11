<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TriageEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'patient_id', 'triage_date', 'ia_score', 'ccmu_score', 'ia_confidence',
        'symptoms_json', 'red_flags', 'orientation', 'recommended_delay',
        'human_validated', 'validated_by', 'final_outcome', 'wait_time_minutes', 'notification_sent',
    ];

    protected $casts = [
        'triage_date' => 'datetime',
        'ia_confidence' => 'decimal:3',
        'symptoms_json' => 'array',
        'red_flags' => 'array',
        'human_validated' => 'boolean',
        'notification_sent' => 'boolean',
        'wait_time_minutes' => 'integer',
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

    public function validator()
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function appointment()
    {
        return $this->hasOne(Appointment::class, 'triage_id');
    }
}