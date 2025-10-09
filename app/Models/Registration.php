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

    // Satu nomor registrasi hanya untuk satu dokumen
    public function document()
    {
        return $this->hasOne(Document::class);
    }

    // Backward compatibility - tetap support documents() untuk existing code
    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function issuedTo()
    {
        return $this->belongsTo(User::class, 'issued_to_user_id');
    }
}
