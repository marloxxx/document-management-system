<?php

namespace Database\Seeders;

use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Registration;
use App\Models\User;
use App\Helpers\RomanNumerals;
use Illuminate\Database\Seeder;

class DocumentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create document types
        $types = [
            ['name' => 'Contract', 'is_active' => true],
            ['name' => 'Invoice', 'is_active' => true],
            ['name' => 'Certificate', 'is_active' => true],
            ['name' => 'Report', 'is_active' => true],
            ['name' => 'Agreement', 'is_active' => true],
            ['name' => 'Translation', 'is_active' => true],
            ['name' => 'Legal Document', 'is_active' => true],
        ];

        foreach ($types as $type) {
            DocumentType::create($type);
        }
    }
}
