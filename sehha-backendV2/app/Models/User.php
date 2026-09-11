<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'uuid', 'cin_hash', 'cin_encrypted', 'name', 'phone_encrypted',
        'email', 'password', 'role', 'otp_secret', 'otp_enabled',
        'last_login_at', 'last_login_ip', 'is_active', 'failed_attempts', 'locked_until',
    ];

    protected $hidden = [
        'password',
        'otp_secret',
        'remember_token',
    ];

    protected $casts = [
        'otp_enabled' => 'boolean',
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
        'locked_until' => 'datetime',
        'failed_attempts' => 'integer',
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

    public function patientRecord()
    {
        return $this->hasOne(PatientRecord::class, 'patient_id');
    }

    public function allergies()
    {
        return $this->hasMany(Allergy::class, 'patient_id');
    }

    public function medicalHistories()
    {
        return $this->hasMany(MedicalHistory::class, 'patient_id');
    }

    public function consultationsAsPatient()
    {
        return $this->hasMany(Consultation::class, 'patient_id');
    }

    public function consultationsAsDoctor()
    {
        return $this->hasMany(Consultation::class, 'doctor_id');
    }

    public function doctorProfile()
    {
        return $this->hasOne(DoctorProfile::class);
    }

    public function triageEvents()
    {
        return $this->hasMany(TriageEvent::class, 'patient_id');
    }

    public function appointmentsAsPatient()
    {
        return $this->hasMany(Appointment::class, 'patient_id');
    }

    public function appointmentsAsDoctor()
    {
        return $this->hasMany(Appointment::class, 'doctor_id');
    }
}