<?php

namespace App\Http\Controllers;

use App\Services\DocumentTemplateService;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Carbon\Carbon;

class ExportController extends Controller
{
    protected $exportService;
    protected $templateService;

    public function __construct(DocumentTemplateService $templateService)
    {
        $this->templateService = $templateService;
    }

    public function exportRepertorium(Request $request)
    {
        $request->validate([
            'direction' => 'required|in:mandarin-indo,indo-mandarin,indo-taiwan,taiwan-indo',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'format' => 'nullable|in:docx,pdf'
        ]);

        $direction = $request->input('direction', 'mandarin-indo');
        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : null;
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : null;
        $format = $request->input('format', 'docx');

        // Map direction parameter to database values
        $directionMap = [
            'mandarin-indo' => 'Mandarin-Indo',
            'indo-mandarin' => 'Indo-Mandarin',
            'indo-taiwan' => 'Indo-Taiwan',
            'taiwan-indo' => 'Taiwan-Indo'
        ];

        $dbDirection = $directionMap[$direction];

        // Query documents
        $query = Document::with(['registration', 'type'])
            ->where('direction', $dbDirection)
            ->where('status', 'SUBMITTED');

        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [$startDate->startOfDay(), $endDate->endOfDay()]);
        }

        $documents = $query->orderBy('created_at', 'asc')->get();

        if ($documents->isEmpty()) {
            return response()->json([
                'error' => 'No documents found for the specified criteria'
            ], 404);
        }

        try {
            if ($format === 'docx') {
                // Use template-based export
                $result = $this->templateService->generateRepertoriumFromTemplate($documents, $direction, $startDate, $endDate);

                return response()->download($result['path'], $result['filename'])->deleteFileAfterSend(true);
            } else {
                // For PDF, we can convert DOCX to PDF using external tools
                return $this->exportToPdf($documents, $direction, $startDate, $endDate);
            }
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to generate export: ' . $e->getMessage()
            ], 500);
        }
    }

    private function exportToPdf($documents, $direction, $startDate, $endDate)
    {
        // First generate DOCX using template
        $result = $this->templateService->generateRepertoriumFromTemplate($documents, $direction, $startDate, $endDate);

        // Convert DOCX to PDF using LibreOffice (if available)
        $pdfPath = str_replace('.docx', '.pdf', $result['path']);

        $command = "libreoffice --headless --convert-to pdf --outdir " . dirname($result['path']) . " " . $result['path'];
        $output = shell_exec($command . ' 2>&1');

        if (file_exists($pdfPath)) {
            $filename = str_replace('.docx', '.pdf', $result['filename']);
            return response()->download($pdfPath, $filename)->deleteFileAfterSend(true);
        } else {
            // Fallback: return DOCX if PDF conversion fails
            return response()->download($result['path'], $result['filename'])->deleteFileAfterSend(true);
        }
    }

    public function getExportFormats()
    {
        return response()->json([
            'formats' => [
                [
                    'value' => 'mandarin-indo',
                    'label' => 'Mandarin → Indonesia',
                    'description' => 'Dokumen dari Bahasa Mandarin ke Bahasa Indonesia'
                ],
                [
                    'value' => 'indo-mandarin',
                    'label' => 'Indonesia → Mandarin',
                    'description' => 'Dokumen dari Bahasa Indonesia ke Bahasa Mandarin'
                ],
                [
                    'value' => 'indo-taiwan',
                    'label' => 'Indonesia → Taiwan',
                    'description' => 'Dokumen dari Bahasa Indonesia ke Bahasa Taiwan'
                ],
                [
                    'value' => 'taiwan-indo',
                    'label' => 'Taiwan → Indonesia',
                    'description' => 'Dokumen dari Bahasa Taiwan ke Bahasa Indonesia'
                ]
            ],
            'file_formats' => [
                [
                    'value' => 'docx',
                    'label' => 'Microsoft Word (.docx)',
                    'description' => 'Format dokumen Word yang bisa diedit'
                ],
                [
                    'value' => 'pdf',
                    'label' => 'PDF (.pdf)',
                    'description' => 'Format dokumen PDF untuk distribusi'
                ]
            ]
        ]);
    }

    public function getAvailableTemplates()
    {
        try {
            $templates = $this->templateService->getAvailableTemplates();

            return response()->json([
                'templates' => $templates,
                'message' => 'Templates retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get templates: ' . $e->getMessage()
            ], 500);
        }
    }

    public function createTemplatesFromExisting()
    {
        try {
            $this->templateService->createTemplatesFromExistingFiles();

            return response()->json([
                'message' => 'Templates created successfully from existing DOCX files'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create templates: ' . $e->getMessage()
            ], 500);
        }
    }
}
