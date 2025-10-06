<?php

namespace App\Traits;

use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

trait HasActivityLog
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly($this->getLoggableAttributes())
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    protected function getLoggableAttributes(): array
    {
        return $this->fillable ?? [];
    }

    protected function getActivityDescriptionForEvent(string $eventName): string
    {
        $modelName = class_basename($this);

        return match ($eventName) {
            'created' => "Created {$modelName}",
            'updated' => "Updated {$modelName}",
            'deleted' => "Deleted {$modelName}",
            default => "Performed {$eventName} on {$modelName}",
        };
    }
}
