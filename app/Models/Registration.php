<?php

namespace App\Models;

use App\Traits\HasActivityLog;
use Illuminate\Database\Eloquent\Model;

class Registration extends Model
{
    use HasActivityLog;
    protected $fillable = [
        'year',
        'month',
        'seq',
        'number',
        'state',
        'issued_to_user_id',
        'issued_at',
        'expires_at'
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function issuedTo()
    {
        return $this->belongsTo(User::class, 'issued_to_user_id');
    }
}
