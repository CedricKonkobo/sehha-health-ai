<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Consultation extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid', 'patient_id', 'doctor_id', 'service_id', 'appointment_id',
        'motif', 'symptoms_notes', 'diagnosis', 'icd10_code', 'treatment',
        'exams_requested', 'vitals_at_visit', 'report_text', 'follow_up_required',
        'follow_up_date', 'consultation_date',
    ];

    protected $casts = [
        'exams_requested' => 'array',
        'vitals_at_visit' => 'array',
        'follow_up_required' => 'boolean',
        'follow_up_date' => 'date',
        'consultation_date' => 'datetime',
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

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public function vitalSigns()
    {
        return $this->hasMany(VitalSign::class, 'consultation_id');
    }
}