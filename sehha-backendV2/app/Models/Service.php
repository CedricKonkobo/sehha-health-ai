<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id', 'name', 'beds_total', 'beds_occupied', 'head_doctor_id',
    ];

    protected $casts = [
        'beds_total' => 'integer',
        'beds_occupied' => 'integer',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function headDoctor()
    {
        return $this->belongsTo(User::class, 'head_doctor_id');
    }

    public function doctorProfiles()
    {
        return $this->hasMany(DoctorProfile::class);
    }
}