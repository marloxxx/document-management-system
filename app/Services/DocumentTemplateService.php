<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DocumentTemplateService
{
    protected $templatePath;

    public function __construct()
    {
        $this->templatePath = storage_path('app/templates/');

        // Ensure templates directory exists
        if (!file_exists($this->templatePath)) {
            mkdir($this->templatePath, 0755, true);
        }
    }

    /**
     * Generate repertorium document from scratch
     */
    public function generateRepertoriumFromTemplate($documents, $direction = 'mandarin-indo', $startDate = null, $endDate = null)
    {
        // Parse dates
        $startDate = $startDate ? Carbon::parse($startDate) : Carbon::now()->startOfMonth();
        $endDate = $endDate ? Carbon::parse($endDate) : Carbon::now()->endOfMonth();

        // Create new PhpWord instance
        $phpWord = new \PhpOffice\PhpWord\PhpWord();

        // Set default font
        $phpWord->setDefaultFontName('Times New Roman');
        $phpWord->setDefaultFontSize(11);

        // Set document properties
        $properties = $phpWord->getDocInfo();
        $properties->setCreator('Document Management System');
        $properties->setTitle('Buku Repertorium');

        // Add cover page section (NO HEADER)
        $coverSection = $phpWord->addSection([
            'marginLeft' => 1440,
            'marginRight' => 1440,
            'marginTop' => 1440,
            'marginBottom' => 1440,
        ]);

        // Add cover page content
        $this->addCoverPage($coverSection, $direction);

        // Add content section with header (NEW SECTION)

        $contentSection = $phpWord->addSection([
            'marginLeft' => 1440,
            'marginRight' => 1440,
            'marginTop' => 100,
            'marginBottom' => 1440,
            'headerHeight' => 100,
            'footerHeight' => 708,
        ]);

        // Create header with garuda image for content section
        $header = $contentSection->addHeader();
        $this->addHeaderWithGaruda($header);

        // Add content section header
        $this->addContentHeader($contentSection, $startDate, $endDate);

        // Add table
        $this->addDocumentsTable($contentSection, $documents);

        // Add footer notes
        $this->addFooterNotes($contentSection);

        // Save to temporary file
        $filename = 'Buku_Repertorium_' . strtoupper($this->getMonthName($startDate->month)) . '_' .
            $startDate->year . '_' . date('Y_m_d_His') . '.docx';
        $tempPath = storage_path('app/temp/' . $filename);

        // Ensure temp directory exists
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $objWriter = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007');
        $objWriter->save($tempPath);

        return [
            'path' => $tempPath,
            'filename' => $filename,
            'size' => filesize($tempPath)
        ];
    }

    /**
     * Add header with garuda image
     */
    private function addHeaderWithGaruda($header)
    {
        $garudaPath = public_path('images/garuda_header.png');

        if (file_exists($garudaPath)) {
            try {
                // Add garuda image to header (match original size: ~445x151 px = ~334x113 pt)
                $header->addImage(
                    $garudaPath,
                    [
                        'width' => 334,
                        'height' => 113,
                        'alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER,
                    ]
                );
            } catch (\Exception $e) {
                // If image fails, log and skip
                Log::warning('Failed to add header image: ' . $e->getMessage());
            }
        }
    }

    /**
     * Add cover page
     */
    private function addCoverPage($section, $direction)
    {
        // Empty space at top
        $section->addTextBreak(1);

        // Garuda image on cover (inline)
        $garudaPath = public_path('images/garuda.png');
        if (file_exists($garudaPath)) {
            try {
                $section->addImage($garudaPath, [
                    'width' => 60,
                    'height' => 49,
                    'alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER,
                ]);
            } catch (\Exception $e) {
                // If image fails, log and skip
                Log::warning('Failed to add cover image: ' . $e->getMessage());
            }
        }

        // Title: BUKU REPORTORIUM (36pt = 72 half-points)
        $section->addText(
            'BUKU REPORTORIUM',
            ['name' => 'Times New Roman', 'size' => 36, 'bold' => false],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'spaceAfter' => 0]
        );

        // Empty paragraphs for spacing
        $section->addTextBreak(3);

        // Name (26pt = 52 half-points)
        $section->addText(
            'STANCHION LIWAN PANGKEY',
            ['name' => 'Times New Roman', 'size' => 26, 'bold' => false],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'spaceAfter' => 0]
        );

        // Title
        $section->addText(
            'PENERJEMAH TERSUMPAH',
            ['name' => 'Times New Roman', 'size' => 26, 'bold' => false],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'spaceAfter' => 0]
        );

        // Direction
        $directionText = $this->getDirectionText($direction);
        $section->addText(
            $directionText,
            ['name' => 'Times New Roman', 'size' => 26, 'bold' => false],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'spaceAfter' => 0]
        );

        // SK Info
        $section->addText(
            'SK MENTERI HUKUM DAN HAK ASASI MANUSIA REPUBLIK INDONESIA',
            ['name' => 'Times New Roman', 'size' => 26, 'bold' => false],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'spaceAfter' => 0]
        );

        $section->addText(
            'NOMOR AHU-32 AH.03.07.2023 TANGGAL 19 Mei 2023',
            ['name' => 'Times New Roman', 'size' => 26, 'bold' => false],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'spaceAfter' => 200]
        );
    }

    /**
     * Add content header (after page break)
     */
    private function addContentHeader($section, $startDate, $endDate)
    {
        // Title
        $section->addText(
            'BUKU REPERTORIUM',
            ['name' => 'Times New Roman', 'size' => 11, 'bold' => false],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'spaceAfter' => 0]
        );

        // Date range
        $dateRangeText = $this->getDateRangeText($startDate, $endDate);
        $section->addText(
            $dateRangeText,
            ['name' => 'Times New Roman', 'size' => 11, 'bold' => false],
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'spaceAfter' => 200]
        );
    }


    /**
     * Add documents table
     */
    private function addDocumentsTable($section, $documents)
    {
        // Table style
        $tableStyle = [
            'borderSize' => 6,
            'borderColor' => '000000',
            'cellMargin' => 50,
            'alignment' => \PhpOffice\PhpWord\SimpleType\JcTable::CENTER,
        ];

        $table = $section->addTable($tableStyle);

        // Header row
        $table->addRow(400);
        $table->addCell(800, ['valign' => 'center'])->addText('NO', ['name' => 'Times New Roman', 'bold' => true, 'size' => 10], ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
        $table->addCell(2000, ['valign' => 'center'])->addText('NOMOR REGISTER *', ['name' => 'Times New Roman', 'bold' => true, 'size' => 10], ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
        $table->addCell(3000, ['valign' => 'center'])->addText('JENIS/ NAMA DOKUMEN**', ['name' => 'Times New Roman', 'bold' => true, 'size' => 10], ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
        $table->addCell(1200, ['valign' => 'center'])->addText('JUMLAH HALAMAN ***', ['name' => 'Times New Roman', 'bold' => true, 'size' => 10], ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
        $table->addCell(1800, ['valign' => 'center'])->addText('Arah Bahasa', ['name' => 'Times New Roman', 'bold' => true, 'size' => 10], ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
        $table->addCell(3000, ['valign' => 'center'])->addText('IDENTITAS PENGGUNA JASA****', ['name' => 'Times New Roman', 'bold' => true, 'size' => 10], ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);

        // Data rows
        $no = 1;
        foreach ($documents as $document) {
            // Get document type name
            $documentTypeName = 'N/A';
            if ($document->document_type_text) {
                $documentTypeName = $document->document_type_text;
            } elseif ($document->type && isset($document->type->name)) {
                $documentTypeName = $document->type->name;
            } elseif (is_string($document->type)) {
                $documentTypeName = $document->type;
            }

            $table->addRow();
            $table->addCell(800, ['valign' => 'center'])->addText($no, ['name' => 'Times New Roman', 'size' => 10], ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::START]);
            $table->addCell(2000, ['valign' => 'center'])->addText($document->registration_number ?? 'N/A', ['name' => 'Times New Roman', 'size' => 10], ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
            $table->addCell(3000, ['valign' => 'center'])->addText(
                strtoupper($documentTypeName),
                ['name' => 'Times New Roman', 'size' => 10],
                ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]
            );
            $table->addCell(1200, ['valign' => 'center'])->addText($document->page_count ?? 1, ['name' => 'Times New Roman', 'size' => 10], ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
            $table->addCell(1800, ['valign' => 'center'])->addText($this->formatDirection($document->direction), ['name' => 'Times New Roman', 'size' => 10], ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
            $table->addCell(3000, ['valign' => 'center'])->addText($document->user_identity ?? 'N/A', ['name' => 'Times New Roman', 'size' => 10], ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER]);
            $no++;
        }
    }

    /**
     * Add footer notes
     */
    private function addFooterNotes($section)
    {
        $section->addTextBreak(1);

        $section->addText('Keterangan:', ['name' => 'Times New Roman', 'bold' => true, 'size' => 10]);
        $section->addText('*)       Nomor Register adalah nomor yang tertera pada affidavit dokumen (pernyataan penerjemah)', ['name' => 'Times New Roman', 'size' => 10]);
        $section->addText('**)     Jenis/Nama Dokumen, contoh: KTP, Akta Kelahiran, Kartu Keluarga, Akta Notaris, dll', ['name' => 'Times New Roman', 'size' => 10]);
        $section->addText('***)   Jumlah Halaman merupakan jumlah halaman teks sumber', ['name' => 'Times New Roman', 'size' => 10]);
        $section->addText('****) Identitas Pengguna Jasa adalah nama pemohon/pemilik dokumen yang memohonkan', ['name' => 'Times New Roman', 'size' => 10]);
    }

    /**
     * Get date range text for header
     */
    private function getDateRangeText($startDate, $endDate)
    {
        $startMonth = $this->getMonthName($startDate->month);
        $endMonth = $this->getMonthName($endDate->month);
        $year = $startDate->year;

        return "TERJEMAHAN BULAN {$startMonth} TAHUN {$year} s.d BULAN {$endMonth} TAHUN {$year}";
    }


    /**
     * Get direction text for template header
     */
    private function getDirectionText($direction)
    {
        $directionMap = [
            'mandarin-indo' => 'BAHASA MANDARIN – BAHASA INDONESIA',
            'indo-mandarin' => 'BAHASA INDONESIA – BAHASA MANDARIN',
        ];

        return $directionMap[$direction] ?? 'BAHASA MANDARIN – BAHASA INDONESIA';
    }


    /**
     * Get month name in Indonesian
     */
    private function getMonthName($month)
    {
        $months = [
            1 => 'JANUARI',
            2 => 'FEBRUARI',
            3 => 'MARET',
            4 => 'APRIL',
            5 => 'MEI',
            6 => 'JUNI',
            7 => 'JULI',
            8 => 'AGUSTUS',
            9 => 'SEPTEMBER',
            10 => 'OKTOBER',
            11 => 'NOVEMBER',
            12 => 'DESEMBER'
        ];

        return $months[$month] ?? 'JANUARI';
    }

    /**
     * Format direction for display
     * Taiwan variants will be displayed as Mandarin
     */
    private function formatDirection($direction)
    {
        $directionMap = [
            'Mandarin-Indo' => 'Mandarin-Indo',
            'Indo-Mandarin' => 'Indo-Mandarin',
            'Indo-Taiwan' => 'Indo-Taiwan',
            'Taiwan-Indo' => 'Taiwan-Indo'
        ];

        return $directionMap[$direction] ?? 'Mandarin-Indo';
    }
}
