<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NumberCounter extends Model
{
    protected $fillable = ['year', 'month', 'current_seq'];
}
