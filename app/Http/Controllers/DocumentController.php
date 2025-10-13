<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Http\Request;
use App\Helpers\DirectionHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Yajra\DataTables\Facades\DataTables;
use App\Services\DocumentTemplateService;
use App\Services\RegistrationNumberService;
use App\Services\S3GlacierService;
use Illuminate\Validation\ValidationException;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class DocumentController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private DocumentTemplateService $templateService,
        private RegistrationNumberService $regSvc,
        private S3GlacierService $s3GlacierService
    ) {}

    public function index(Request $r)
    {
        $user = $r->user();

        if ($r->wantsJson()) {
            return $this->getDataTableData($r);
        }

        // Get all users for filter (admin only)
        $users = [];
        if ($user->role === 'ADMIN') {
            $users = User::orderBy('name')->get(['id', 'name', 'role']);
        }

        return Inertia::render('Documents/Index', [
            'isAdmin' => $user->role === 'ADMIN',
            'users' => $users,
        ]);
    }

    public function getDataTableData(Request $r)
    {
        try {
            $user = $r->user();

            $query = Document::with(['owner:id,name', 'type:id,name', 'registration:id,number'])
                ->select([
                    'id',
                    'registration_number',
                    'direction',
                    'status',
                    'title',
                    'document_type_text',
                    'page_count',
                    'evidence_path',
                    'user_identity',
                    'created_at',
                    'updated_at',
                    'owner_user_id',
                    'document_type_id',
                    'registration_id'
                ])
                ->when($user->role === 'CLIENT', fn($q) => $q->where('owner_user_id', $user->id));

            // Apply filters
            if ($r->has('direction') && $r->direction !== 'all') {
                $query->where('direction', $r->direction);
            }

            if ($r->has('status') && $r->status !== 'all') {
                $query->where('status', $r->status);
            }

            // Filter by owner/client (admin only)
            if ($user->role === 'ADMIN' && $r->has('owner_user_id') && $r->owner_user_id !== 'all') {
                $query->where('owner_user_id', $r->owner_user_id);
            }

            // Apply search
            if ($r->filled('q')) {
                $kw = '%' . $r->q . '%';
                $query->where(function ($w) use ($kw) {
                    $w->where('registration_number', 'like', $kw)
                        ->orWhere('title', 'like', $kw)
                        ->orWhere('document_type_text', 'like', $kw)
                        ->orWhere('user_identity', 'like', $kw);
                });
            }

            $dataTable = DataTables::of($query)
                ->addColumn('owner', function ($document) {
                    return $document->owner ? $document->owner->name : 'Unknown';
                })
                ->addColumn('type', function ($document) {
                    // Prioritize document_type_id (predefined type) over document_type_text (custom type)
                    if ($document->document_type_id && $document->type) {
                        return $document->type->name;
                    }
                    return $document->document_type_text ?: 'Not specified';
                })
                ->addColumn('registration', function ($document) {
                    return $document->registration ? $document->registration->number : 'N/A';
                })
                ->addColumn('direction', function ($document) {
                    return DirectionHelper::convertToNewFormat($document->direction);
                })
                ->rawColumns(['direction']);

            return $dataTable->make(true);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch documents data',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function create(): \Inertia\Response
    {
        /** @var User $user */
        $user = Auth::user();

        // Ambil registrations yang bisa digunakan (ISSUED saja)
        // Satu nomor registrasi hanya untuk satu dokumen
        $availableRegistrations = Registration::where('issued_to_user_id', $user->id)
            ->where('state', 'ISSUED')
            ->orderByDesc('created_at')
            ->get(['id', 'number', 'state']);

        return Inertia::render('Documents/Create', [
            'types' => DocumentType::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
            'directions' => DirectionHelper::getAvailableDirections(),
            'availableRegistrations' => $availableRegistrations,
        ]);
    }

    public function previewNumber(): \Illuminate\Http\JsonResponse
    {
        $preview = $this->regSvc->preview();
        return response()->json(['registration_number' => $preview]);
    }

    public function store(Request $r)
    {
        $user = $r->user();

        // Strict validation for document creation
        $validationRules = [
            'registration_number'  => 'required|exists:registrations,number',
            'direction'            => 'required|in:Indo-Mandarin,Mandarin-Indo,Indo-Taiwan,Taiwan-Indo',
            'document_type_id'     => 'nullable|exists:document_types,id',
            'document_type_text'   => 'nullable|string|max:255',
            'page_count'          => 'required|integer|min:1',
            'title'               => 'nullable|string|max:255',
            'notes'               => 'nullable|string',
            'user_identity'       => 'nullable|string',
            'issued_date'         => 'nullable|date',
            'evidence'            => 'nullable|file|mimes:pdf,doc,docx|max:20480',
        ];

        $data = $r->validate($validationRules);

        // Convert direction to old format for database storage
        $data['direction'] = DirectionHelper::convertToOldFormat($data['direction']);

        return DB::transaction(function () use ($data, $user) {
            $reg = Registration::where('number', $data['registration_number'])->lockForUpdate()->firstOrFail();

            // Check if registration already has a document
            // Satu nomor registrasi hanya untuk satu dokumen
            if ($reg->documents()->exists()) {
                throw ValidationException::withMessages(['registration_number' => 'Nomor registrasi ini sudah digunakan untuk dokumen lain. Silakan gunakan nomor registrasi yang berbeda.']);
            }

            // Check if registration can still be used
            if ($reg->state === 'COMMITTED') {
                throw ValidationException::withMessages(['registration_number' => 'Registration number ini sudah digunakan dan tidak bisa ditambah dokumen lagi.']);
            }

            $doc = new Document();
            $doc->fill([
                'owner_user_id' => $user->id,
                'registration_id' => $reg->id,
                'registration_number' => $reg->number,
                'registration_year' => $reg->year,
                'registration_month' => $reg->month,
                'registration_seq' => $reg->seq,
                'direction' => $data['direction'],
                'document_type_id' => $data['document_type_id'] ?? null,
                'document_type_text' => $data['document_type_text'] ?? null,
                'page_count' => $data['page_count'],
                'title' => $data['title'] ?? null,
                'notes' => $data['notes'] ?? null,
                'user_identity' => $data['user_identity'] ?? null,
                'issued_date' => $data['issued_date'] ?? null,
                'status' => 'SUBMITTED',
                'created_by' => $user->id,
            ]);

            if (request()->hasFile('evidence')) {
                $file = request()->file('evidence');
                $fileName = time() . '_' . $file->getClientOriginalName();
                $path = 'documents/' . now()->format('Y/m') . '/' . $fileName;

                // Upload to S3 Glacier
                $uploadResult = $this->s3GlacierService->uploadToGlacier($file, $path, 'GLACIER');

                if ($uploadResult !== false) {
                    $doc->evidence_path = $uploadResult;
                    $doc->evidence_mime = $file->getClientMimeType();
                    $doc->evidence_size = $file->getSize();
                } else {
                    throw new \Exception('Failed to upload evidence to S3 Glacier');
                }
            }

            $doc->save();

            // Update state registration
            $this->regSvc->refreshState($reg);

            return redirect()->route('documents.show', $doc->id)->with('success', 'Dokumen berhasil dibuat.');
        });
    }

    public function show(Document $document): \Inertia\Response
    {
        $this->authorize('view', $document);
        $document->load(['owner:id,name', 'type:id,name', 'registration:id,number', 'createdBy:id,name', 'updatedBy:id,name']);

        // Convert direction to new format for frontend
        $document->direction = DirectionHelper::convertToNewFormat($document->direction);

        // Format dates properly for frontend
        if ($document->issued_date) {
            $document->issued_date_formatted = $document->issued_date->format('Y-m-d');
        }

        return Inertia::render('Documents/Show', ['document' => $document]);
    }

    public function edit(Document $document): \Inertia\Response
    {
        $this->authorize('update', $document);

        /** @var User $user */
        $user = Auth::user();

        // Load document with relationships
        $document->load(['type:id,name', 'registration:id,number']);

        // Ambil registrations yang bisa digunakan (ISSUED saja)
        // Satu nomor registrasi hanya untuk satu dokumen
        // Juga sertakan registration yang sedang digunakan oleh document ini
        $availableRegistrations = Registration::where('issued_to_user_id', $user->id)
            ->where(function ($q) use ($document) {
                $q->where('state', 'ISSUED')
                    ->orWhere('id', $document->registration_id);
            })
            ->orderByDesc('created_at')
            ->get(['id', 'number', 'state']);

        // Convert direction to new format for frontend
        $document->direction = DirectionHelper::convertToNewFormat($document->direction);

        return Inertia::render('Documents/Edit', [
            'document' => $document,
            'types' => DocumentType::where('is_active', 1)->orderBy('name')->get(['id', 'name']),
            'directions' => DirectionHelper::getAvailableDirections(),
            'availableRegistrations' => $availableRegistrations,
        ]);
    }

    public function update(Request $r, Document $document)
    {
        $this->authorize('update', $document);

        // Check if this is a draft save
        $isDraft = ($r->input('is_draft') === 'true' || $r->input('is_draft') === true || $r->input('is_draft') === 1);

        // For draft, use more lenient validation - only validate format if data is provided
        if ($isDraft) {
            $validationRules = [
                'registration_number'  => 'nullable|string',
                'direction'            => 'nullable|string',
                'document_type_id'     => 'nullable|string',
                'document_type_text'   => 'nullable|string|max:255',
                'page_count'          => 'nullable|string',
                'title'               => 'nullable|string|max:255',
                'notes'               => 'nullable|string',
                'user_identity'       => 'nullable|string',
                'issued_date'         => 'nullable|string',
                'evidence'            => 'nullable|file|mimes:pdf,doc,docx|max:20480',
                'is_draft'            => 'nullable|string',
            ];
        } else {
            // For non-draft, use strict validation
            $validationRules = [
                'registration_number'  => 'required|exists:registrations,number',
                'direction'            => 'required|in:Indo-Mandarin,Mandarin-Indo,Indo-Taiwan,Taiwan-Indo',
                'document_type_id'     => 'nullable|exists:document_types,id',
                'document_type_text'   => 'nullable|string|max:255',
                'page_count'          => 'required|numeric|min:1',
                'title'               => 'nullable|string|max:255',
                'notes'               => 'nullable|string',
                'user_identity'       => 'nullable|string',
                'issued_date'         => 'nullable|date',
                'evidence'            => 'nullable|file|mimes:pdf,doc,docx|max:20480',
                'is_draft'            => 'nullable|string',
            ];
        }

        $data = $r->validate($validationRules);

        // Convert string values to appropriate types
        if (isset($data['page_count']) && $data['page_count']) {
            $data['page_count'] = (int) $data['page_count'];
        }
        if (isset($data['document_type_id']) && $data['document_type_id']) {
            $data['document_type_id'] = (int) $data['document_type_id'];
        }

        // Convert direction to old format for database storage (only if direction is provided)
        if (isset($data['direction']) && $data['direction']) {
            $data['direction'] = DirectionHelper::convertToOldFormat($data['direction']);
        }

        // Determine status based on is_draft flag
        $status = $isDraft ? 'DRAFT' : 'SUBMITTED';
        unset($data['is_draft']); // Remove from data array

        return DB::transaction(function () use ($data, $document, $status, $isDraft) {
            // For draft, we might not have all required fields, so handle gracefully
            if ($isDraft && (!isset($data['registration_number']) || !$data['registration_number'])) {
                // For draft without registration number, keep existing registration
                $reg = $document->registration;
            } else {
                $reg = Registration::where('number', $data['registration_number'])->lockForUpdate()->firstOrFail();
            }

            // Cek apakah registration sudah digunakan dokumen lain (kecuali dokumen ini sendiri)
            // Satu nomor registrasi hanya untuk satu dokumen
            if (isset($data['registration_number']) && $data['registration_number'] && $reg->id !== $document->registration_id) {
                $hasOtherDocument = $reg->documents()
                    ->where('id', '!=', $document->id)
                    ->exists();

                if ($hasOtherDocument) {
                    throw ValidationException::withMessages(['registration_number' => 'Nomor registrasi ini sudah digunakan untuk dokumen lain. Silakan gunakan nomor registrasi yang berbeda.']);
                }

                // Cek apakah registration masih bisa digunakan
                if ($reg->state === 'COMMITTED') {
                    throw ValidationException::withMessages(['registration_number' => 'Registration number ini sudah digunakan dan tidak bisa ditambah dokumen lagi.']);
                }
            }

            // Prepare fill data, only update fields that are provided
            $fillData = [
                'status' => $status,
            ];

            // Only update registration-related fields if registration number is provided
            if (isset($data['registration_number']) && $data['registration_number']) {
                $fillData['registration_id'] = $reg->id;
                $fillData['registration_number'] = $reg->number;
                $fillData['registration_year'] = $reg->year;
                $fillData['registration_month'] = $reg->month;
                $fillData['registration_seq'] = $reg->seq;
            }

            // Only update direction if provided
            if (isset($data['direction']) && $data['direction']) {
                $fillData['direction'] = $data['direction'];
            }

            // Only update page_count if provided
            if (isset($data['page_count']) && $data['page_count']) {
                $fillData['page_count'] = $data['page_count'];
            }

            // Update other fields if provided
            if (isset($data['document_type_id'])) {
                $fillData['document_type_id'] = $data['document_type_id'];
            }
            if (isset($data['document_type_text'])) {
                $fillData['document_type_text'] = $data['document_type_text'];
            }
            if (isset($data['title'])) {
                $fillData['title'] = $data['title'];
            }
            if (isset($data['notes'])) {
                $fillData['notes'] = $data['notes'];
            }
            if (isset($data['user_identity'])) {
                $fillData['user_identity'] = $data['user_identity'];
            }
            if (isset($data['issued_date'])) {
                $fillData['issued_date'] = $data['issued_date'];
            }

            $document->fill($fillData);

            if (request()->hasFile('evidence')) {
                $file = request()->file('evidence');
                $fileName = time() . '_' . $file->getClientOriginalName();
                $path = 'documents/' . now()->format('Y/m') . '/' . $fileName;

                // Upload to S3 Glacier
                $uploadResult = $this->s3GlacierService->uploadToGlacier($file, $path, 'GLACIER');

                if ($uploadResult !== false) {
                    // Delete old evidence from S3 if exists
                    if ($document->evidence_path) {
                        $this->s3GlacierService->deleteFile($document->evidence_path);
                    }

                    $document->evidence_path = $uploadResult;
                    $document->evidence_mime = $file->getClientMimeType();
                    $document->evidence_size = $file->getSize();
                } else {
                    throw new \Exception('Failed to upload evidence to S3 Glacier');
                }
            }

            $document->save();

            return redirect()->route('documents.show', $document->id)->with('ok', 'Dokumen berhasil diperbarui');
        });
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Document $document)
    {
        $this->authorize('delete', $document);

        return DB::transaction(function () use ($document) {
            $reg = $document->registration;

            // Delete evidence file from S3 Glacier if exists
            if ($document->evidence_path) {
                $this->s3GlacierService->deleteFile($document->evidence_path);
            }

            // Delete the document
            $document->delete();

            // Update registration state
            $this->regSvc->refreshState($reg);

            // Always return JSON response for API requests
            if (request()->wantsJson() || request()->ajax()) {
                return response()->json(['message' => 'Dokumen berhasil dihapus.']);
            }

            return redirect()->route('documents.index')->with('success', 'Dokumen berhasil dihapus');
        });
    }

    /**
     * Download evidence file for the specified document.
     * Handle Glacier restore if needed.
     */
    public function downloadEvidence(Document $document)
    {
        $this->authorize('view', $document);

        if (!$document->evidence_path) {
            abort(404, 'Evidence file not found');
        }

        try {
            // Check restore status
            $restoreStatus = $this->s3GlacierService->checkRestoreStatus($document->evidence_path);

            // If file is in Glacier and not restored yet
            if ($restoreStatus['status'] === 'not_archived') {
                // File is not archived, can be downloaded directly
                $content = $this->s3GlacierService->downloadRestoredFile($document->evidence_path);

                if ($content === false) {
                    abort(500, 'Failed to download file');
                }

                $filename = basename($document->evidence_path);
                $mimeType = $document->evidence_mime ?: 'application/octet-stream';

                return response($content)
                    ->header('Content-Type', $mimeType)
                    ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
            } elseif ($restoreStatus['status'] === 'completed') {
                // File has been restored and is ready for download
                $content = $this->s3GlacierService->downloadRestoredFile($document->evidence_path);

                if ($content === false) {
                    abort(500, 'Failed to download file');
                }

                $filename = basename($document->evidence_path);
                $mimeType = $document->evidence_mime ?: 'application/octet-stream';

                return response($content)
                    ->header('Content-Type', $mimeType)
                    ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
            } elseif ($restoreStatus['status'] === 'in_progress') {
                // Restore is already in progress
                return response()->json([
                    'message' => 'File restore is in progress. Please try again in a few hours.',
                    'status' => 'in_progress'
                ], 202);
            } else {
                // File needs to be restored first
                $initiated = $this->s3GlacierService->initiateRestore($document->evidence_path, 7, 'Standard');

                if ($initiated) {
                    return response()->json([
                        'message' => 'File restore has been initiated. This process may take 3-5 hours. Please try downloading again later.',
                        'status' => 'initiated'
                    ], 202);
                } else {
                    abort(500, 'Failed to initiate file restore');
                }
            }
        } catch (\Exception $e) {
            abort(500, 'Failed to process download: ' . $e->getMessage());
        }
    }

    /**
     * Get user identity suggestions for autocomplete
     */
    public function getUserIdentitySuggestions(Request $request)
    {
        $query = $request->get('q', '');
        $user = $request->user();

        if (empty($query)) {
            return response()->json([]);
        }

        // Only get suggestions from documents owned by the current user
        $suggestions = Document::where('owner_user_id', $user->id)
            ->whereNotNull('user_identity')
            ->where('user_identity', 'like', '%' . $query . '%')
            ->distinct()
            ->pluck('user_identity')
            ->take(10)
            ->map(function ($identity) {
                return [
                    'value' => $identity,
                    'label' => $identity
                ];
            })
            ->values();

        return response()->json($suggestions);
    }

    /**
     * Export documents to Excel/CSV
     * Admin: can export all documents with direction filter
     * Client: can only export their own documents
     */
    public function export(Request $request)
    {
        $user = $request->user();

        // Both admin and client can export
        // Admin: can export all documents with filters
        // Client: can only export their own documents

        // Get selected document IDs from request
        $selectedIds = $request->get('ids', '');
        $ids = $selectedIds ? explode(',', $selectedIds) : [];

        // Build query - only SUBMITTED status
        $query = Document::with(['registration', 'type', 'owner'])
            ->where('status', 'SUBMITTED'); // Only export submitted documents

        // Client can only export their own documents
        if ($user->role === 'CLIENT') {
            $query->where('owner_user_id', $user->id);
        }

        // Filter by selected IDs if provided
        if (!empty($ids)) {
            $query->whereIn('id', $ids);
        }

        // Apply direction filter - expand to include Taiwan variants (Admin only)
        if ($user->role === 'ADMIN' && $request->has('direction') && $request->direction) {
            $selectedDirection = $request->direction;

            // Expand direction to include Taiwan variants
            $directionsToExport = [];
            if ($selectedDirection === 'indo-mandarin') {
                // Indo-Mandarin includes Indo-Taiwan
                $directionsToExport = ['Indo-Mandarin', 'Indo-Taiwan'];
            } elseif ($selectedDirection === 'mandarin-indo') {
                // Mandarin-Indo includes Taiwan-Indo
                $directionsToExport = ['Mandarin-Indo', 'Taiwan-Indo'];
            }

            if (!empty($directionsToExport)) {
                $query->whereIn('direction', $directionsToExport);
            }
        }

        if ($request->has('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        // Get documents
        $documents = $query->get();

        // Check if any documents found
        if ($documents->isEmpty()) {
            return response()->json([
                'error' => 'No documents found matching the selected criteria.'
            ], 404);
        }

        // Determine template direction
        $templateDirection = 'mandarin-indo'; // Default

        if ($user->role === 'ADMIN' && $request->has('direction') && $request->direction) {
            // Admin: use selected direction
            if ($request->direction === 'indo-mandarin') {
                $templateDirection = 'indo-mandarin';
            } elseif ($request->direction === 'mandarin-indo') {
                $templateDirection = 'mandarin-indo';
            }
        } else {
            // Client or admin without direction filter: detect from documents
            $directions = $documents->pluck('direction')->unique()->values()->toArray();
            $newFormatDirections = array_map(function ($direction) {
                return DirectionHelper::convertToNewFormat($direction);
            }, $directions);

            if (in_array('Indo-Mandarin', $newFormatDirections) || in_array('Indo-Taiwan', $newFormatDirections)) {
                $templateDirection = 'indo-mandarin';
            } elseif (in_array('Mandarin-Indo', $newFormatDirections) || in_array('Taiwan-Indo', $newFormatDirections)) {
                $templateDirection = 'mandarin-indo';
            }
        }

        // Generate export using template service
        try {
            $startDate = $documents->min('created_at');
            $endDate = $documents->max('created_at');

            $result = $this->templateService->generateRepertoriumFromTemplate(
                $documents,
                $templateDirection,
                $startDate,
                $endDate
            );

            return response()->download($result['path'], $result['filename'])->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Export failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
