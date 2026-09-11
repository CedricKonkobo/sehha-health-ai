<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PatientRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id', 'blood_group', 'height_cm', 'coverage_type', 'referring_doctor_id',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function referringDoctor()
    {
        return $this->belongsTo(User::class, 'referring_doctor_id');
    }
}