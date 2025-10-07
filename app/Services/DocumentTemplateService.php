<?php

namespace App\Services;

use PhpOffice\PhpWord\TemplateProcessor;
use Carbon\Carbon;

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
     * Generate repertorium document from template
     */
    public function generateRepertoriumFromTemplate($documents, $direction = 'mandarin-indo', $startDate = null, $endDate = null)
    {
        // Determine template file based on direction
        $templateFile = $this->getTemplateFile($direction);

        if (!file_exists($templateFile)) {
            throw new \Exception("Template file not found: {$templateFile}");
        }

        // Create template processor
        $templateProcessor = new TemplateProcessor($templateFile);

        // Set basic variables
        $this->setBasicVariables($templateProcessor, $direction, $startDate, $endDate);

        // Set table data
        $this->setTableData($templateProcessor, $documents);

        // Apply fallback content replacement if needed
        $this->applyFallbackReplacements($templateProcessor, $direction, $startDate, $endDate, $documents);

        // Save to temporary file
        $filename = 'repertorium_' . strtolower(str_replace('-', '_', $direction)) . '_' . date('Y_m_d_H_i_s') . '.docx';
        $tempPath = storage_path('app/temp/' . $filename);

        // Ensure temp directory exists
        if (!file_exists(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $templateProcessor->saveAs($tempPath);

        return [
            'path' => $tempPath,
            'filename' => $filename,
            'size' => filesize($tempPath)
        ];
    }

    /**
     * Get template file path based on direction
     */
    private function getTemplateFile($direction)
    {
        // Map directions to template files
        // Indo-Mandarin dan Indo-Taiwan menggunakan template yang sama (Indonesia ke bahasa lain)
        // Mandarin-Indo dan Taiwan-Indo menggunakan template yang sama (bahasa lain ke Indonesia)
        $templateFiles = [
            'mandarin-indo' => 'repertorium_mandarin_indo_template.docx',
            'indo-mandarin' => 'repertorium_indo_mandarin_template.docx',
            'indo-taiwan' => 'repertorium_indo_mandarin_template.docx',  // Menggunakan template Indo-Mandarin
            'taiwan-indo' => 'repertorium_mandarin_indo_template.docx'    // Menggunakan template Mandarin-Indo
        ];

        $templateName = $templateFiles[$direction] ?? 'repertorium_mandarin_indo_template.docx';
        return $this->templatePath . $templateName;
    }

    /**
     * Set basic variables in template
     */
    private function setBasicVariables($templateProcessor, $direction, $startDate, $endDate)
    {
        // Set direction text
        $directionText = $this->getDirectionText($direction);
        $this->setValueSafely($templateProcessor, 'direction_text', $directionText);

        // Set date range
        $dateRange = $this->getDateRange($startDate, $endDate);
        $this->setValueSafely($templateProcessor, 'date_range', $dateRange);

        // Set current date
        $this->setValueSafely($templateProcessor, 'current_date', Carbon::now()->format('d F Y'));

        // Set year
        $year = $startDate ? Carbon::parse($startDate)->year : Carbon::now()->year;
        $this->setValueSafely($templateProcessor, 'year', $year);

        // Set month range
        if ($startDate && $endDate) {
            $startMonth = $this->getMonthName(Carbon::parse($startDate)->month);
            $endMonth = $this->getMonthName(Carbon::parse($endDate)->month);
            $this->setValueSafely($templateProcessor, 'start_month', $startMonth);
            $this->setValueSafely($templateProcessor, 'end_month', $endMonth);
        } else {
            $currentMonth = $this->getMonthName(Carbon::now()->month);
            $this->setValueSafely($templateProcessor, 'start_month', $currentMonth);
            $this->setValueSafely($templateProcessor, 'end_month', $currentMonth);
        }
    }

    /**
     * Safely set value in template processor
     */
    private function setValueSafely($templateProcessor, $placeholder, $value)
    {
        try {
            $templateProcessor->setValue($placeholder, $value);
        } catch (\Exception $e) {
            // If placeholder doesn't exist, try to replace it in the document content
            // This is a fallback method for templates without proper placeholders
            \Log::warning("Placeholder '{$placeholder}' not found in template, using fallback replacement");
        }
    }

    /**
     * Set table data in template
     */
    private function setTableData($templateProcessor, $documents)
    {
        // Check if template has table placeholders
        try {
            // Try to clone row - this will work if template has proper placeholders
            $templateProcessor->cloneRow('no', count($documents));

            $no = 1;
            foreach ($documents as $document) {
                $this->setValueSafely($templateProcessor, "no#{$no}", $no);
                $this->setValueSafely($templateProcessor, "registration_number#{$no}", $document->registration_number ?? 'N/A');
                $this->setValueSafely($templateProcessor, "document_title#{$no}", $document->title ?? $document->document_type_text ?? 'N/A');
                $this->setValueSafely($templateProcessor, "page_count#{$no}", $document->page_count ?? 1);
                $this->setValueSafely($templateProcessor, "direction#{$no}", $this->formatDirection($document->direction ?? 'N/A'));
                $this->setValueSafely($templateProcessor, "user_identity#{$no}", $document->user_identity ?? 'N/A');
                $no++;
            }
        } catch (\Exception $e) {
            // If cloning fails, it means template doesn't have proper table placeholders
            // Log the error and continue with basic variables only
            \Log::warning("Template doesn't have proper table placeholders: " . $e->getMessage());
            
            // Try alternative approach - create a simple text table at the end
            $this->createFallbackTable($templateProcessor, $documents);
        }
    }

    /**
     * Create fallback table when template doesn't have proper placeholders
     */
    private function createFallbackTable($templateProcessor, $documents)
    {
        try {
            // Create a simple text-based table
            $tableContent = "\n\nDOKUMEN TERJEMAHAN:\n\n";
            $tableContent .= "No\tRegistration Number\tTitle\tPages\tDirection\tUser Identity\n";
            $tableContent .= str_repeat("-", 80) . "\n";
            
            $no = 1;
            foreach ($documents as $document) {
                $tableContent .= sprintf(
                    "%d\t%s\t%s\t%d\t%s\t%s\n",
                    $no,
                    $document->registration_number ?? 'N/A',
                    $document->title ?? $document->document_type_text ?? 'N/A',
                    $document->page_count ?? 1,
                    $this->formatDirection($document->direction ?? 'N/A'),
                    $document->user_identity ?? 'N/A'
                );
                $no++;
            }
            
            // Try to add this content to the document
            $this->setValueSafely($templateProcessor, 'document_list', $tableContent);
            
        } catch (\Exception $e) {
            \Log::error("Failed to create fallback table: " . $e->getMessage());
        }
    }

    /**
     * Get direction text for template
     */
    private function getDirectionText($direction)
    {
        $directionMap = [
            'mandarin-indo' => 'BAHASA MANDARIN – BAHASA INDONESIA',
            'indo-mandarin' => 'BAHASA INDONESIA – BAHASA MANDARIN',
            'indo-taiwan' => 'BAHASA INDONESIA – BAHASA TAIWAN',
            'taiwan-indo' => 'BAHASA TAIWAN – BAHASA INDONESIA'
        ];

        return $directionMap[$direction] ?? 'BAHASA MANDARIN – BAHASA INDONESIA';
    }

    /**
     * Get date range text
     */
    private function getDateRange($startDate, $endDate)
    {
        if (!$startDate || !$endDate) {
            $startDate = Carbon::now()->startOfMonth();
            $endDate = Carbon::now()->endOfMonth();
        } else {
            // Parse dates if they are strings
            $startDate = Carbon::parse($startDate);
            $endDate = Carbon::parse($endDate);
        }

        $startMonth = $this->getMonthName($startDate->month);
        $endMonth = $this->getMonthName($endDate->month);
        $year = $startDate->year;

        return "TERJEMAHAN BULAN {$startMonth} TAHUN {$year} s.d BULAN {$endMonth} TAHUN {$year}";
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

    /**
     * Create template files from existing DOCX files
     */
    public function createTemplatesFromExistingFiles()
    {
        $baseDir = base_path();
        $existingFiles = [
            'mandarin-indo' => 'Stanchion Liwan Pangkey - Buku Repertorium JULI 2025 - SEPTEMBER  2025 (mandarin-indo).docx',
            'indo-mandarin' => 'Stanchion Liwan Pangkey - Buku Repertorium JULI 2025 - SEPTEMBER 2025 (indo-mandarin).docx'
        ];

        // Map to correct template names
        $templateNames = [
            'mandarin-indo' => 'repertorium_mandarin_indonesia_template.docx',
            'indo-mandarin' => 'repertorium_indonesia_mandarin_template.docx'
        ];

        foreach ($existingFiles as $direction => $filename) {
            $sourcePath = $baseDir . '/' . $filename;
            $templatePath = $this->templatePath . $templateNames[$direction];

            if (file_exists($sourcePath)) {
                // Copy file to templates directory
                copy($sourcePath, $templatePath);

                // Replace dynamic content with placeholders
                $this->replaceContentWithPlaceholders($templatePath);

                echo "Template created: {$templatePath}\n";
            }
        }
    }

    /**
     * Replace dynamic content with placeholders in template
     */
    private function replaceContentWithPlaceholders($templatePath)
    {
        // This is a simplified approach - in practice, you might want to use
        // a more sophisticated DOCX manipulation library

        $zip = new \ZipArchive();
        if ($zip->open($templatePath) === TRUE) {
            // Read document.xml
            $content = $zip->getFromName('word/document.xml');

            if ($content) {
                // Replace specific text patterns with placeholders
                $replacements = [
                    'JULI TAHUN 2025 s.d BULAN SEPTEMBER TAHUN 2025' => '${date_range}',
                    'BAHASA MANDARIN – BAHASA INDONESIA' => '${direction_text}',
                    'BAHASA INDONESIA – BAHASA MANDARIN' => '${direction_text}',
                    // Add more replacements as needed
                ];

                foreach ($replacements as $search => $replace) {
                    $content = str_replace($search, $replace, $content);
                }

                // Write back to zip
                $zip->addFromString('word/document.xml', $content);
            }

            $zip->close();
        }
    }

    /**
     * Get available templates
     */
    public function getAvailableTemplates()
    {
        $templates = [];
        $files = glob($this->templatePath . '*.docx');

        foreach ($files as $file) {
            $filename = basename($file);
            if (strpos($filename, 'template') !== false) {
                $templates[] = [
                    'filename' => $filename,
                    'path' => $file,
                    'size' => filesize($file),
                    'modified' => date('Y-m-d H:i:s', filemtime($file))
                ];
            }
        }

        return $templates;
    }
}
