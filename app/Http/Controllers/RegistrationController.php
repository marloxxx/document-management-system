<?php

namespace App\Http\Controllers;

use App\Models\Registration;
use App\Services\RegistrationNumberService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;

class RegistrationController extends Controller
{
    public function __construct(
        private RegistrationNumberService $regSvc
    ) {}

    public function index(Request $r): \Inertia\Response|\Illuminate\Http\JsonResponse
    {
        if ($r->wantsJson()) {
            return $this->getDataTableData($r);
        }

        $user = $r->user();

        return Inertia::render('Registrations/Index', [
            'registrations' => [],
            'filters' => [
                'q' => $r->q,
            ],
            'isAdmin' => $user->role === 'ADMIN',
        ]);
    }

    /**
     * Get Yajra DataTable data for registrations
     */
    public function getDataTableData(Request $request)
    {
        try {
            $user = $request->user();

            $query = Registration::with(['issuedTo:id,name', 'documents:id,registration_id,direction,title,status'])
                ->select([
                    'id',
                    'number',
                    'year',
                    'month',
                    'seq',
                    'state',
                    'issued_to_user_id',
                    'created_at',
                    'updated_at',
                ])
                ->when($user->role === 'CLIENT', fn($q) => $q->where('issued_to_user_id', $user->id));

            // Apply search filter
            if ($request->filled('search.value')) {
                $searchValue = $request->input('search.value');
                $query->where('number', 'like', '%' . $searchValue . '%');
            }

            return DataTables::of($query)
                ->addColumn('issued_to', function ($registration) {
                    return $registration->issuedTo ? [
                        'id' => $registration->issuedTo->id,
                        'name' => $registration->issuedTo->name,
                    ] : null;
                })
                ->addColumn('documents', function ($registration) {
                    return $registration->documents ? $registration->documents->map(function ($doc) {
                        return [
                            'id' => $doc->id,
                            'direction' => $doc->direction,
                            'title' => $doc->title,
                            'status' => $doc->status,
                        ];
                    })->toArray() : [];
                })
                ->editColumn('created_at', function ($registration) {
                    return $registration->created_at->format('Y-m-d H:i:s');
                })
                ->make(true);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve registrations datatable data', [
                'error' => $e->getMessage(),
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw new \Exception('Failed to retrieve registrations datatable data: ' . $e->getMessage());
        }
    }

    public function issue(Request $r): \Illuminate\Http\JsonResponse
    {
        $user = $r->user();

        if (!$user) {
            return response()->json([
                'error' => 'User not authenticated'
            ], 401);
        }

        $reg = $this->regSvc->issue($user);
        return response()->json([
            'number' => $reg->number,
            'registration_id' => $reg->id,
            'state' => $reg->state
        ]);
    }

    public function preview(): \Illuminate\Http\JsonResponse
    {
        $preview = $this->regSvc->preview();
        return response()->json(['registration_number' => $preview]);
    }
}
