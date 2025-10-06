<?php

namespace App\Http\Controllers;

use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Yajra\DataTables\Facades\DataTables;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        if ($request->wantsJson()) {
            return $this->getDataTableData($request);
        }

        return Inertia::render('ActivityLogs/Index');
    }

    public function getDataTableData(Request $request)
    {
        try {
            $query = Activity::with(['causer', 'subject'])
                ->select([
                    'id',
                    'log_name',
                    'description',
                    'subject_type',
                    'subject_id',
                    'causer_type',
                    'causer_id',
                    'properties',
                    'created_at',
                ]);

            // Apply filters
            if ($request->has('log_name') && $request->log_name !== 'all') {
                $query->where('log_name', $request->log_name);
            }

            if ($request->has('causer_id') && $request->causer_id !== 'all') {
                $query->where('causer_id', $request->causer_id);
            }

            if ($request->has('date_from') && $request->date_from) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }

            if ($request->has('date_to') && $request->date_to) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }

            return DataTables::of($query)
                ->addColumn('user_name', function ($activity) {
                    return $activity->causer ? $activity->causer->name : 'System';
                })
                ->addColumn('user_email', function ($activity) {
                    return $activity->causer ? $activity->causer->email : '-';
                })
                ->addColumn('subject_name', function ($activity) {
                    if (!$activity->subject) return '-';

                    if ($activity->subject_type === 'App\\Models\\User') {
                        return $activity->subject->name;
                    }

                    if ($activity->subject_type === 'App\\Models\\Document') {
                        return $activity->subject->registration_number;
                    }

                    if ($activity->subject_type === 'App\\Models\\Registration') {
                        return $activity->subject->number;
                    }

                    return class_basename($activity->subject_type) . ' #' . $activity->subject_id;
                })
                ->addColumn('ip_address', function ($activity) {
                    return $activity->properties['ip_address'] ?? '-';
                })
                ->addColumn('formatted_date', function ($activity) {
                    return $activity->created_at->format('Y-m-d H:i:s');
                })
                ->rawColumns(['properties'])
                ->make(true);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch activity logs'], 500);
        }
    }

    public function show(Activity $activity)
    {
        $activity->load(['causer', 'subject']);

        return Inertia::render('ActivityLogs/Show', [
            'activity' => $activity,
        ]);
    }

    public function export(Request $request)
    {
        $query = Activity::with(['causer', 'subject']);

        // Apply same filters as index
        if ($request->has('log_name') && $request->log_name !== 'all') {
            $query->where('log_name', $request->log_name);
        }

        if ($request->has('causer_id') && $request->causer_id !== 'all') {
            $query->where('causer_id', $request->causer_id);
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $activities = $query->latest()->get();

        $csvData = [];
        $csvData[] = ['ID', 'Date', 'User', 'Action', 'Subject', 'IP Address', 'Properties'];

        foreach ($activities as $activity) {
            $csvData[] = [
                $activity->id,
                $activity->created_at->format('Y-m-d H:i:s'),
                $activity->causer ? $activity->causer->name : 'System',
                $activity->description,
                $activity->subject ? $activity->subject->name ?? $activity->subject->registration_number ?? 'N/A' : 'N/A',
                $activity->properties['ip_address'] ?? '-',
                json_encode($activity->properties),
            ];
        }

        $filename = 'activity_logs_' . now()->format('Y-m-d_H-i-s') . '.csv';

        $callback = function () use ($csvData) {
            $file = fopen('php://output', 'w');
            foreach ($csvData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
