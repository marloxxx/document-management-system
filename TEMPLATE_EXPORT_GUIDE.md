# Template-Based Document Export

## Overview

Sistem export dokumen menggunakan template DOCX yang sudah ada, kemudian mengisi bagian yang dinamis seperti bulan dan data tabel. Ini lebih efisien daripada membuat dokumen dari scratch.

## Template Structure

### Template Files Location
```
storage/app/templates/
├── repertorium_mandarin_indonesia_template.docx    (untuk Mandarin-Indo dan Taiwan-Indo)
└── repertorium_indonesia_mandarin_template.docx    (untuk Indo-Mandarin dan Indo-Taiwan)
```

### Template Mapping
- **Mandarin-Indo** → `repertorium_mandarin_indonesia_template.docx`
- **Indo-Mandarin** → `repertorium_indonesia_mandarin_template.docx`
- **Indo-Taiwan** → `repertorium_indonesia_mandarin_template.docx` (menggunakan template Indo-Mandarin)
- **Taiwan-Indo** → `repertorium_mandarin_indonesia_template.docx` (menggunakan template Mandarin-Indo)

### Placeholders yang Digunakan

#### 1. Basic Variables
- `${date_range}` - Range tanggal (contoh: "TERJEMAHAN BULAN JULI TAHUN 2025 s.d BULAN SEPTEMBER TAHUN 2025")
- `${direction_text}` - Arah bahasa (contoh: "BAHASA MANDARIN – BAHASA INDONESIA")
- `${year}` - Tahun saat ini
- `${current_date}` - Tanggal saat ini
- `${start_month}` - Bulan mulai
- `${end_month}` - Bulan akhir

#### 2. Table Data (Auto-cloned)
- `${no#1}`, `${no#2}`, etc. - Nomor urut
- `${registration_number#1}`, `${registration_number#2}`, etc. - Nomor register
- `${document_title#1}`, `${document_title#2}`, etc. - Judul dokumen
- `${page_count#1}`, `${page_count#2}`, etc. - Jumlah halaman
- `${direction#1}`, `${direction#2}`, etc. - Arah terjemahan
- `${user_identity#1}`, `${user_identity#2}`, etc. - Identitas pengguna

## API Endpoints

### 1. Export Repertorium
```
GET /export/repertorium
```

**Parameters:**
- `direction` (required): mandarin-indo, indo-mandarin, indo-taiwan, taiwan-indo
- `start_date` (optional): Tanggal mulai (YYYY-MM-DD)
- `end_date` (optional): Tanggal akhir (YYYY-MM-DD)
- `format` (optional): docx, pdf (default: docx)

**Example:**
```
GET /export/repertorium?direction=mandarin-indo&start_date=2025-07-01&end_date=2025-09-30&format=docx
```

### 2. Get Available Templates
```
GET /export/templates
```

**Response:**
```json
{
  "templates": [
    {
      "filename": "repertorium_mandarin_indo_template.docx",
      "path": "/path/to/template",
      "size": 166480,
      "modified": "2025-10-07 12:27:45"
    }
  ],
  "message": "Templates retrieved successfully"
}
```

### 3. Create Templates from Existing Files
```
POST /export/create-templates
```

## Usage Examples

### 1. Export Mandarin to Indonesia Documents
```php
use App\Services\DocumentTemplateService;

$templateService = new DocumentTemplateService();
$result = $templateService->generateRepertoriumFromTemplate(
    $documents, 
    'mandarin-indo', 
    Carbon::parse('2025-07-01'), 
    Carbon::parse('2025-09-30')
);

// Download file
return response()->download($result['path'], $result['filename']);
```

### 2. Export with Date Range
```php
$startDate = Carbon::parse('2025-07-01');
$endDate = Carbon::parse('2025-09-30');

$result = $templateService->generateRepertoriumFromTemplate(
    $documents, 
    'indo-mandarin', 
    $startDate, 
    $endDate
);
```

## Template Creation Process

### 1. Automatic Creation from Existing Files
```bash
php create_templates.php
```

### 2. Add Placeholders to Templates
```bash
php add_placeholders.php
```

### 3. Manual Template Creation
1. Copy your DOCX template to `storage/app/templates/`
2. Name it according to convention: `repertorium_{direction}_template.docx`
3. Replace dynamic content with placeholders
4. Ensure table has at least one row with placeholders

## Template Requirements

### 1. File Naming Convention
- `repertorium_mandarin_indonesia_template.docx` (untuk Mandarin-Indo dan Taiwan-Indo)
- `repertorium_indonesia_mandarin_template.docx` (untuk Indo-Mandarin dan Indo-Taiwan)

### 2. Content Structure
- Header dengan placeholder `${direction_text}`
- Date range dengan placeholder `${date_range}`
- Tabel dengan minimal 1 baris data
- Baris tabel harus memiliki placeholder untuk semua kolom

### 3. Table Structure
Tabel harus memiliki kolom:
- NO (${no#1})
- NOMOR REGISTER (${registration_number#1})
- JENIS/ NAMA DOKUMEN (${document_title#1})
- JUMLAH HALAMAN (${page_count#1})
- Arah Bahasa (${direction#1})
- IDENTITAS PENGGUNA JASA (${user_identity#1})

## Benefits

### 1. Efficiency
- Tidak perlu membuat dokumen dari scratch
- Formatting sudah sesuai dengan standar
- Lebih cepat dalam proses generate

### 2. Consistency
- Format dokumen konsisten
- Styling yang sama untuk semua export
- Mudah untuk maintenance

### 3. Flexibility
- Mudah untuk update template
- Bisa customize sesuai kebutuhan
- Support multiple directions

### 4. Performance
- Template sudah di-cache
- Proses pengisian data lebih cepat
- Memory usage lebih efisien

## Error Handling

### 1. Template Not Found
```json
{
  "error": "Template file not found: repertorium_mandarin_indo_template.docx"
}
```

### 2. No Documents Found
```json
{
  "error": "No documents found for the specified criteria"
}
```

### 3. Export Generation Failed
```json
{
  "error": "Failed to generate export: [error message]"
}
```

## Maintenance

### 1. Update Templates
- Edit template file di `storage/app/templates/`
- Pastikan placeholder masih ada
- Test dengan data sample

### 2. Add New Directions
- Buat template baru dengan naming convention yang benar
- Update `getTemplateFile()` method di `DocumentTemplateService`
- Test export functionality

### 3. Backup Templates
- Backup template files secara berkala
- Simpan di version control jika diperlukan
- Dokumentasikan perubahan template
