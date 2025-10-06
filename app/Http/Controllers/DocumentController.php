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

            return DataTables::of($query)
                ->addColumn('owner', function ($document) {
                    return $document->owner ? $document->owner->name : 'Unknown';
                })
                ->addColumn('type', function ($document) {
                    return $document->type ? $document->type->name : $document->document_type_text;
                })
                ->addColumn('registration', function ($document) {
                    return $document->registration ? $document->registration->number : 'N/A';
                })
                ->addColumn('direction', function ($document) {
                    return DirectionHelper::convertToNewFormat($document->direction);
                })
                ->rawColumns(['direction'])
                ->make(true);
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

        $data = $r->validate([
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
            'is_draft'            => 'nullable|boolean',
        ]);

        // Convert direction to old format for database storage
        $data['direction'] = DirectionHelper::convertToOldFormat($data['direction']);

        // Determine status based on is_draft flag
        $status = $data['is_draft'] ? 'DRAFT' : 'SUBMITTED';
        unset($data['is_draft']); // Remove from data array

        return DB::transaction(function () use ($data, $user, $status) {
            $reg = Registration::where('number', $data['registration_number'])->lockForUpdate()->firstOrFail();

            // Cegah duplikasi dokumen pada arah sama
            $exists = $reg->documents()->where('direction', $data['direction'])->exists();
            if ($exists) {
                throw ValidationException::withMessages(['direction' => 'Dokumen untuk arah ini pada nomor tersebut sudah ada.']);
            }

            // Cek apakah registration masih bisa digunakan
            if ($reg->state === 'COMMITTED') {
                throw ValidationException::withMessages(['registration_number' => 'Registration number ini sudah lengkap (COMMITTED) dan tidak bisa ditambah dokumen lagi.']);
            }

            $doc = new Document();
            $doc->fill([
                'owner_user_id' => $user->id,
                'registration_id' => $reg->id,
                'registration_number' => $reg->number, // cache untuk tampilan cepat
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
                'status' => $status,
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

            return redirect()->route('documents.show', $doc->id)->with('ok', 'Dokumen tersimpan');
        });
    }

    public function show(Document $document): \Inertia\Response
    {
        $this->authorize('view', $document);
        $document->load(['owner:id,name', 'type:id,name', 'registration:id,number', 'createdBy:id,name', 'updatedBy:id,name']);

        // Convert direction to new format for frontend
        $document->direction = DirectionHelper::convertToNewFormat($document->direction);

        return Inertia::render('Documents/Show', ['document' => $document]);
    }

    public function edit(Document $document): \Inertia\Response
    {
        $this->authorize('update', $document);

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

        $data = $r->validate([
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
            'is_draft'            => 'nullable|boolean',
        ]);

        // Convert direction to old format for database storage
        $data['direction'] = DirectionHelper::convertToOldFormat($data['direction']);

        // Determine status based on is_draft flag
        $status = $data['is_draft'] ? 'DRAFT' : 'SUBMITTED';
        unset($data['is_draft']); // Remove from data array

        return DB::transaction(function () use ($data, $document, $status) {
            $reg = Registration::where('number', $data['registration_number'])->lockForUpdate()->firstOrFail();

            // Cek duplikasi dokumen pada arah sama (kecuali dokumen ini sendiri)
            $exists = $reg->documents()
                ->where('direction', $data['direction'])
                ->where('id', '!=', $document->id)
                ->exists();

            if ($exists) {
                throw ValidationException::withMessages(['direction' => 'Dokumen untuk arah ini pada nomor tersebut sudah ada.']);
            }

            // Cek apakah registration masih bisa digunakan (kecuali jika tidak mengubah registration)
            if ($reg->state === 'COMMITTED' && $reg->id !== $document->registration_id) {
                throw ValidationException::withMessages(['registration_number' => 'Registration number ini sudah lengkap (COMMITTED) dan tidak bisa ditambah dokumen lagi.']);
            }

            $document->fill([
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
                'status' => $status,
            ]);

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
}
