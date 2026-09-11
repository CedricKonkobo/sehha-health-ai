<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicalHistory extends Model
{
    use HasFactory;

    protected $table = 'medical_history';

    protected $fillable = [
        'patient_id', 'type', 'description_encrypted', 'started_at', 'resolved_at',
    ];

    protected $casts = [
        'started_at' => 'date',
        'resolved_at' => 'date',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }
}