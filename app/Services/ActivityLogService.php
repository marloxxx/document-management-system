<?php

namespace App\Services;

use Spatie\Activitylog\Models\Activity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class ActivityLogService
{
    public static function logUserAction(string $action, Model $model = null, array $properties = []): void
    {
        $user = Auth::user();

        activity()
            ->causedBy($user)
            ->performedOn($model)
            ->withProperties(array_merge($properties, [
                'user_id' => $user?->id,
                'user_name' => $user?->name,
                'user_email' => $user?->email,
                'user_role' => $user?->role,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'url' => request()->fullUrl(),
                'method' => request()->method(),
            ]))
            ->log($action);
    }

    public static function logLogin(string $email, bool $success = true): void
    {
        activity()
            ->withProperties([
                'email' => $email,
                'success' => $success,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'url' => request()->fullUrl(),
            ])
            ->log($success ? 'User logged in' : 'Failed login attempt');
    }

    public static function logLogout(): void
    {
        $user = Auth::user();

        activity()
            ->causedBy($user)
            ->withProperties([
                'user_id' => $user?->id,
                'user_name' => $user?->name,
                'user_email' => $user?->email,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ])
            ->log('User logged out');
    }

    public static function logFileUpload(string $filename, string $path, int $size, string $mimeType): void
    {
        $user = Auth::user();

        activity()
            ->causedBy($user)
            ->withProperties([
                'filename' => $filename,
                'path' => $path,
                'size' => $size,
                'mime_type' => $mimeType,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ])
            ->log('File uploaded');
    }

    public static function logFileDownload(string $filename, string $path): void
    {
        $user = Auth::user();

        activity()
            ->causedBy($user)
            ->withProperties([
                'filename' => $filename,
                'path' => $path,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ])
            ->log('File downloaded');
    }

    public static function logBulkAction(string $action, array $ids, string $modelType): void
    {
        $user = Auth::user();

        activity()
            ->causedBy($user)
            ->withProperties([
                'action' => $action,
                'affected_ids' => $ids,
                'count' => count($ids),
                'model_type' => $modelType,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ])
            ->log("Bulk {$action} on {$modelType}");
    }

    public static function getRecentActivities(int $limit = 50)
    {
        return Activity::with(['causer', 'subject'])
            ->latest()
            ->limit($limit)
            ->get();
    }

    public static function getUserActivities(int $userId, int $limit = 50)
    {
        return Activity::where('causer_id', $userId)
            ->with(['causer', 'subject'])
            ->latest()
            ->limit($limit)
            ->get();
    }

    public static function getModelActivities(Model $model, int $limit = 50)
    {
        return Activity::where('subject_type', get_class($model))
            ->where('subject_id', $model->id)
            ->with(['causer', 'subject'])
            ->latest()
            ->limit($limit)
            ->get();
    }
}
