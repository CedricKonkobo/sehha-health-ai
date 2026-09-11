<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Allergy extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id', 'substance_encrypted', 'severity', 'reaction_description', 'discovered_at', 'documented_by',
    ];

    protected $casts = [
        'discovered_at' => 'date',
    ];

    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function documentedBy()
    {
        return $this->belongsTo(User::class, 'documented_by');
    }
}