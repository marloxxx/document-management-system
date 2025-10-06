<?php

namespace App\Models;

use App\Traits\HasActivityLog;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasActivityLog;
    protected $fillable = [
        'owner_user_id',
        'registration_id',
        'direction',
        'registration_number',
        'registration_year',
        'registration_month',
        'registration_seq',
        'document_type_id',
        'document_type_text',
        'page_count',
        'title',
        'notes',
        'user_identity',
        'issued_date',
        'evidence_path',
        'evidence_mime',
        'evidence_size',
        'status',
        'created_by',
        'updated_by'
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function registration()
    {
        return $this->belongsTo(Registration::class);
    }

    public function type()
    {
        return $this->belongsTo(DocumentType::class, 'document_type_id');
    }

    public function tags()
    {
        return $this->belongsToMany(DocumentTag::class, 'document_tag_pivot', 'document_id', 'tag_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    protected $casts = [
        'issued_date' => 'date',
    ];
}
