<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Registration;
use App\Services\RegistrationNumberService;
use App\Helpers\DirectionHelper;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class DocumentController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private RegistrationNumberService $regSvc
    ) {}

    public function index(Request $r)
    {
        $user = $r->user();

        if ($r->wantsJson()) {
            return $this->getDataTableData($r);
        }

        return Inertia::render('Documents/Index', [
            'isAdmin' => $user->role === 'ADMIN',
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

        // Ambil registrations yang bisa digunakan (ISSUED atau PARTIAL)
        // PARTIAL berarti masih bisa ditambah dokumen dengan arah yang berbeda
        $availableRegistrations = Registration::where('issued_to_user_id', $user->id)
            ->whereIn('state', ['ISSUED', 'PARTIAL'])
            ->orderByDesc('created_at')
            ->get(['id', 'number', 'state'])
            ->map(function ($reg) {
                // Tambahkan informasi tentang dokumen yang sudah ada
                $existingDocs = $reg->documents()->get(['direction']);
                $reg->existing_directions = $existingDocs->pluck('direction')->toArray();
                return $reg;
            });

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

            // Check for duplicates
            $exists = $reg->documents()->where('direction', $data['direction'])->exists();
            if ($exists) {
                throw ValidationException::withMessages(['direction' => 'Dokumen untuk arah ini pada nomor tersebut sudah ada.']);
            }

            // Check if registration can still be used
            if ($reg->state === 'COMMITTED') {
                throw ValidationException::withMessages(['registration_number' => 'Registration number ini sudah lengkap (COMMITTED) dan tidak bisa ditambah dokumen lagi.']);
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
                $path = $file->store('documents/' . now()->format('Y/m'));
                $doc->evidence_path = $path;
                $doc->evidence_mime = $file->getClientMimeType();
                $doc->evidence_size = $file->getSize();
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

        // Ambil registrations yang bisa digunakan (ISSUED atau PARTIAL)
        // PARTIAL berarti masih bisa ditambah dokumen dengan arah yang berbeda
        $availableRegistrations = Registration::where('issued_to_user_id', $user->id)
            ->whereIn('state', ['ISSUED', 'PARTIAL'])
            ->orderByDesc('created_at')
            ->get(['id', 'number', 'state'])
            ->map(function ($reg) {
                // Tambahkan informasi tentang dokumen yang sudah ada
                $existingDocs = $reg->documents()->get(['direction']);
                $reg->existing_directions = $existingDocs->pluck('direction')->map(function ($direction) {
                    return DirectionHelper::convertToNewFormat($direction);
                })->toArray();
                return $reg;
            });

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

            // Only check for duplicates if we have both registration and direction
            if (isset($data['direction']) && $data['direction'] && isset($data['registration_number']) && $data['registration_number']) {
                $exists = $reg->documents()
                    ->where('direction', $data['direction'])
                    ->where('id', '!=', $document->id)
                    ->exists();

                if ($exists) {
                    throw ValidationException::withMessages(['direction' => 'Dokumen untuk arah ini pada nomor tersebut sudah ada.']);
                }
            }

            // Cek apakah registration masih bisa digunakan (kecuali jika tidak mengubah registration)
            if (isset($data['registration_number']) && $data['registration_number'] && $reg->state === 'COMMITTED' && $reg->id !== $document->registration_id) {
                throw ValidationException::withMessages(['registration_number' => 'Registration number ini sudah lengkap (COMMITTED) dan tidak bisa ditambah dokumen lagi.']);
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
                $path = $file->store('documents/' . now()->format('Y/m'));
                $document->evidence_path = $path;
                $document->evidence_mime = $file->getClientMimeType();
                $document->evidence_size = $file->getSize();
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

            // Delete the document
            $document->delete();

            // Update registration state
            $this->regSvc->refreshState($reg);

            if (request()->wantsJson()) {
                return response()->json(['message' => 'Dokumen berhasil dihapus.']);
            }

            return redirect()->route('documents.index')->with('success', 'Dokumen berhasil dihapus');
        });
    }

    /**
     * Download evidence file for the specified document.
     */
    public function downloadEvidence(Document $document)
    {
        $this->authorize('view', $document);

        if (!$document->evidence_path || !Storage::exists($document->evidence_path)) {
            abort(404, 'Evidence file not found');
        }

        $filename = basename($document->evidence_path);
        $mimeType = $document->evidence_mime ?: Storage::mimeType($document->evidence_path);

        return Storage::download($document->evidence_path, $filename, [
            'Content-Type' => $mimeType,
        ]);
    }
}
