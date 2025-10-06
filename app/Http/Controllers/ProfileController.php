<?php

namespace App\Http\Controllers;

use App\Models\User;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Services\ActivityLogService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\RedirectResponse;
use Spatie\Activitylog\Models\Activity;

class ProfileController extends Controller
{
    /**
     * Display the user's profile.
     */
    public function index()
    {
        $user = Auth::user();

        return Inertia::render('Profile/Index', [
            'user' => $user,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(Request $request): RedirectResponse
    {
        /** @var User $user **/
        $user = Auth::user();

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
        ]);

        $oldData = [
            'name' => $user->name,
            'email' => $user->email,
        ];

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
        ]);

        ActivityLogService::logUserAction('Updated profile', $user, [
            'updated_fields' => ['name', 'email'],
            'old_values' => [
                'name' => $oldData['name'],
                'email' => $oldData['email'],
            ],
            'new_values' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);

        return redirect()->route('profile.index')
            ->with('success', 'Profile updated successfully.');
    }

    /**
     * Update the user's password.
     */
    public function updatePassword(Request $request): \Illuminate\Http\RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $request->validate([
            'current_password' => 'required|current_password',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        ActivityLogService::logUserAction('Updated password', $user, [
            'password_changed' => true,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        return redirect()->route('profile.index')
            ->with('success', 'Password updated successfully.');
    }

    /**
     * Get user's recent activities.
     */
    public function activities(Request $request)
    {
        $user = Auth::user();

        if ($request->wantsJson()) {
            return $this->getActivitiesData($request, $user);
        }

        return Inertia::render('Profile/Activities', [
            'user' => $user,
        ]);
    }

    /**
     * Get activities data for DataTable.
     */
    public function getActivitiesData(Request $request, $user)
    {
        try {
            $query = Activity::where('causer_id', $user->id)
                ->with(['causer', 'subject'])
                ->select([
                    'id',
                    'log_name',
                    'description',
                    'subject_type',
                    'subject_id',
                    'properties',
                    'created_at',
                ]);

            // Apply filters
            if ($request->has('log_name') && $request->log_name !== 'all') {
                $query->where('log_name', $request->log_name);
            }

            if ($request->has('date_from') && $request->date_from) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }

            if ($request->has('date_to') && $request->date_to) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }

            return \Yajra\DataTables\Facades\DataTables::of($query)
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
            return response()->json(['error' => 'Failed to fetch activities'], 500);
        }
    }
}
