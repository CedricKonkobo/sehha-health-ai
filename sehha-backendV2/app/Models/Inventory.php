<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    use HasFactory;

    protected $table = 'inventory';

    protected $fillable = [
        'clinic_id', 'product_name', 'quantity', 'unit', 'alert_threshold', 'status', 'last_updated_by',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'alert_threshold' => 'integer',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function lastUpdatedBy()
    {
        return $this->belongsTo(User::class, 'last_updated_by');
    }
}