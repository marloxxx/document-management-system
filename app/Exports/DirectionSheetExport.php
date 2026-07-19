<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DirectionSheetExport implements FromCollection, ShouldAutoSize, WithHeadings, WithStyles, WithTitle
{
    public function __construct(private Collection $documents, private string $direction) {}

    public function collection(): Collection
    {
        return $this->documents->values()->map(function ($document, $index) {
            $typeName = $document->document_type_text
                ?: ($document->type->name ?? 'N/A');

            return [
                $index + 1,
                $document->registration_number ?? 'N/A',
                strtoupper($typeName),
                $document->page_count ?? 1,
                $document->direction,
                $document->user_identity ?? 'N/A',
                optional($document->issued_date)->format('d-m-Y') ?? '-',
                $document->status,
            ];
        });
    }

    public function headings(): array
    {
        return [
            'No',
            'Nomor Register',
            'Jenis/Nama Dokumen',
            'Jumlah Halaman',
            'Arah Bahasa',
            'Identitas Pengguna Jasa',
            'Tanggal Terbit',
            'Status',
        ];
    }

    public function title(): string
    {
        return $this->direction;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
