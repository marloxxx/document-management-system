<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Registration;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        if ($user->role === 'ADMIN') {
            return $this->adminDashboard();
        } else {
            return $this->clientDashboard($user);
        }
    }

    private function adminDashboard()
    {
        // Statistics untuk admin
        $stats = [
            'total_users' => User::count(),
            'total_clients' => User::where('role', 'CLIENT')->count(),
            'total_registrations' => Registration::count(),
            'total_documents' => Document::count(),
            'issued_registrations' => Registration::where('state', 'ISSUED')->count(),
            'partial_registrations' => Registration::where('state', 'PARTIAL')->count(),
            'committed_registrations' => Registration::where('state', 'COMMITTED')->count(),
        ];

        // Latest registration number (most recent overall)
        $latestRegistration = Registration::with(['issuedTo:id,name'])
            ->orderByDesc('created_at')
            ->first();

        // Recent registrations
        $recentRegistrations = Registration::with(['issuedTo:id,name'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        // Recent documents
        $recentDocuments = Document::with(['owner:id,name', 'type:id,name', 'registration:id,number'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        // Monthly statistics
        $monthlyStats = $this->getMonthlyStats();

        // Top clients by document count
        $topClients = User::where('role', 'CLIENT')
            ->withCount('documents')
            ->orderByDesc('documents_count')
            ->limit(5)
            ->get();

        return Inertia::render('Dashboard/Admin', [
            'stats' => $stats,
            'latestRegistration' => $latestRegistration,
            'recentRegistrations' => $recentRegistrations,
            'recentDocuments' => $recentDocuments,
            'monthlyStats' => $monthlyStats,
            'topClients' => $topClients,
        ]);
    }

    private function clientDashboard($user)
    {
        // Statistics untuk client
        $stats = [
            'my_registrations' => Registration::where('issued_to_user_id', $user->id)->count(),
            'my_documents' => Document::where('owner_user_id', $user->id)->count(),
            'issued_registrations' => Registration::where('issued_to_user_id', $user->id)->where('state', 'ISSUED')->count(),
            'partial_registrations' => Registration::where('issued_to_user_id', $user->id)->where('state', 'PARTIAL')->count(),
            'committed_registrations' => Registration::where('issued_to_user_id', $user->id)->where('state', 'COMMITTED')->count(),
        ];

        // Latest registration number
        $latestRegistration = Registration::where('issued_to_user_id', $user->id)
            ->orderByDesc('created_at')
            ->first();

        // Recent registrations
        $recentRegistrations = Registration::where('issued_to_user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        // Recent documents
        $recentDocuments = Document::where('owner_user_id', $user->id)
            ->with(['type:id,name', 'registration:id,number'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        // Available registrations (ISSUED atau PARTIAL)
        $availableRegistrations = Registration::where('issued_to_user_id', $user->id)
            ->whereIn('state', ['ISSUED', 'PARTIAL'])
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Dashboard/Client', [
            'stats' => $stats,
            'latestRegistration' => $latestRegistration,
            'recentRegistrations' => $recentRegistrations,
            'recentDocuments' => $recentDocuments,
            'availableRegistrations' => $availableRegistrations,
        ]);
    }

    private function getMonthlyStats()
    {
        $currentYear = now()->year;
        $currentMonth = now()->month;

        $monthlyData = [];

        for ($i = 1; $i <= 12; $i++) {
            $registrations = Registration::whereYear('created_at', $currentYear)
                ->whereMonth('created_at', $i)
                ->count();

            $documents = Document::whereYear('created_at', $currentYear)
                ->whereMonth('created_at', $i)
                ->count();

            $monthlyData[] = [
                'month' => date('M', mktime(0, 0, 0, $i, 1)),
                'registrations' => $registrations,
                'documents' => $documents,
            ];
        }

        return $monthlyData;
    }
}
