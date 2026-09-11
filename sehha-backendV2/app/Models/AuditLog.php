<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'action', 'resource_type', 'resource_id',
        'old_values', 'new_values', 'ip_address', 'user_agent', 'timestamp',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'timestamp' => 'datetime',
    ];

    public $timestamps = true;

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}