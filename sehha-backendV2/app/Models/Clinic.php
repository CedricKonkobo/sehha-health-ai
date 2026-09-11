<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Clinic extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'address', 'city', 'phone', 'type', 'capacity_beds', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'capacity_beds' => 'integer',
    ];

    public function services()
    {
        return $this->hasMany(Service::class);
    }
}