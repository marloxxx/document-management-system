<?php

namespace App\Exports;

use App\Helpers\DirectionHelper;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class DocumentsByDirectionExport implements WithMultipleSheets
{
    public function __construct(private Collection $documents) {}

    public function sheets(): array
    {
        $grouped = $this->documents->groupBy('direction');

        // Keep a stable, predictable sheet order instead of relying on group discovery order.
        $orderedDirections = array_values(array_filter(
            DirectionHelper::getAvailableDirections(),
            fn ($direction) => $grouped->has($direction)
        ));

        return array_map(
            fn ($direction) => new DirectionSheetExport($grouped->get($direction), $direction),
            $orderedDirections
        );
    }
}
