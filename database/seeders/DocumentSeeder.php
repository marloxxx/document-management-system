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
        // Get users (assuming UserSeeder has been run)
        $client1 = User::where('email', 'client1@example.com')->first();
        $client2 = User::where('email', 'client2@example.com')->first();

        if (!$client1 || !$client2) {
            $this->command->error('Please run UserSeeder first!');
            return;
        }

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

        // Create sample registrations
        $romanMonth = RomanNumerals::toRoman(10); // October = X

        $reg1 = Registration::create([
            'year' => 2025,
            'month' => 10,
            'seq' => 1,
            'number' => sprintf('01/%s/2025', $romanMonth),
            'state' => 'COMMITTED',
            'issued_to_user_id' => $client1->id,
            'issued_at' => now()->subDays(5),
        ]);

        $reg2 = Registration::create([
            'year' => 2025,
            'month' => 10,
            'seq' => 2,
            'number' => sprintf('02/%s/2025', $romanMonth),
            'state' => 'PARTIAL',
            'issued_to_user_id' => $client2->id,
            'issued_at' => now()->subDays(3),
        ]);

        $reg3 = Registration::create([
            'year' => 2025,
            'month' => 10,
            'seq' => 3,
            'number' => sprintf('03/%s/2025', $romanMonth),
            'state' => 'ISSUED',
            'issued_to_user_id' => $client1->id,
            'issued_at' => now()->subDays(1),
        ]);

        // Create sample documents
        $contractType = DocumentType::where('name', 'Contract')->first();
        $invoiceType = DocumentType::where('name', 'Invoice')->first();
        $translationType = DocumentType::where('name', 'Translation')->first();

        // Sample document 1 - Indo-Mandarin
        Document::create([
            'owner_user_id' => $client1->id,
            'registration_id' => $reg1->id,
            'direction' => 'Indo-Mandarin',
            'registration_number' => $reg1->number,
            'registration_year' => $reg1->year,
            'registration_month' => $reg1->month,
            'registration_seq' => $reg1->seq,
            'document_type_id' => $contractType->id,
            'page_count' => 5,
            'title' => 'Service Contract Agreement (Indo-Mandarin)',
            'notes' => 'Initial contract for translation services',
            'user_identity' => 'John Doe - Client ID: 12345',
            'issued_date' => now()->subDays(5),
            'status' => 'SUBMITTED',
            'created_by' => $client1->id,
        ]);

        // Sample document 2 - Mandarin-Indo (pasangan dari reg1)
        Document::create([
            'owner_user_id' => $client1->id,
            'registration_id' => $reg1->id,
            'direction' => 'Mandarin-Indo',
            'registration_number' => $reg1->number . '_ZH',
            'registration_year' => $reg1->year,
            'registration_month' => $reg1->month,
            'registration_seq' => $reg1->seq,
            'document_type_id' => $contractType->id,
            'page_count' => 5,
            'title' => 'Service Contract Agreement (Mandarin-Indo)',
            'notes' => 'Initial contract for translation services - reverse',
            'user_identity' => 'John Doe - Client ID: 12345',
            'issued_date' => now()->subDays(4),
            'status' => 'SUBMITTED',
            'created_by' => $client1->id,
        ]);

        // Sample document 3 - hanya satu arah (PARTIAL)
        Document::create([
            'owner_user_id' => $client2->id,
            'registration_id' => $reg2->id,
            'direction' => 'Indo-Taiwan',
            'registration_number' => $reg2->number,
            'registration_year' => $reg2->year,
            'registration_month' => $reg2->month,
            'registration_seq' => $reg2->seq,
            'document_type_id' => $invoiceType->id,
            'page_count' => 2,
            'title' => 'Monthly Invoice (Indo-Taiwan)',
            'notes' => 'October translation services invoice',
            'user_identity' => 'Jane Smith - Client ID: 67890',
            'issued_date' => now()->subDays(3),
            'status' => 'SUBMITTED',
            'created_by' => $client2->id,
        ]);

        // Sample document 4 - dengan custom type
        Document::create([
            'owner_user_id' => $client1->id,
            'registration_id' => $reg2->id,
            'direction' => 'Taiwan-Indo',
            'registration_number' => $reg2->number . '_TW',
            'registration_year' => $reg2->year,
            'registration_month' => $reg2->month,
            'registration_seq' => $reg2->seq,
            'document_type_text' => 'Custom Legal Document',
            'page_count' => 3,
            'title' => 'Legal Document Translation (Taiwan-Indo)',
            'notes' => 'Custom legal document translation',
            'user_identity' => 'John Doe - Client ID: 12345',
            'issued_date' => now()->subDays(2),
            'status' => 'SUBMITTED',
            'created_by' => $client1->id,
        ]);

        $this->command->info('Sample documents created successfully!');
        $this->command->info('');
        $this->command->info('Sample registrations:');
        $this->command->info('- 01/X/2025: COMMITTED (2 documents: Indo-Mandarin + Mandarin-Indo)');
        $this->command->info('- 02/X/2025: PARTIAL (2 documents: Indo-Taiwan + Taiwan-Indo)');
        $this->command->info('- 03/X/2025: ISSUED (no documents yet)');
        $this->command->info('');
        $this->command->info('Document types created: Contract, Invoice, Certificate, Report, Agreement, Translation, Legal Document');
        $this->command->info('Direction formats: Indo-Mandarin, Mandarin-Indo, Indo-Taiwan, Taiwan-Indo');
    }
}
