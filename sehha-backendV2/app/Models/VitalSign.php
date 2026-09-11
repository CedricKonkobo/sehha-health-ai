<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VitalSign extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id', 'consultation_id', 'type', 'value', 'value_2', 'unit',
        'measured_at', 'source', 'is_abnormal', 'alert_sent', 'note',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'value_2' => 'decimal:2',
        'is_abnormal' => 'boolean',
        'alert_sent' => 'boolean',
        'measured_at' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }
}