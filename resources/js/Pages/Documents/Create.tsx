"use client"

import type * as React from "react"
import { Head, useForm, Link } from "@inertiajs/react"
import AppLayout from "@/Layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, FileText, Save, AlertCircle, BookOpen } from "lucide-react"
import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { DatePicker } from "@/components/ui/date-picker"

interface DocumentType {
  id: number
  name: string
}

interface Registration {
  id: number
  number: string
  state: string
  existing_directions?: string[]
}

interface Props {
  types: DocumentType[]
  directions: string[]
  availableRegistrations: Registration[]
  errors?: Record<string, string>
}

export default function CreateDocument({ types, directions, availableRegistrations, errors: _serverErrors }: Props) {
  const { toast } = useToast()

  const { data, setData, post, processing, errors, reset } = useForm({
    registration_number: "",
    direction: "",
    document_type_id: "",
    document_type_text: "",
    page_count: "1",
    title: "",
    notes: "",
    user_identity: "",
    issued_date: undefined as Date | undefined,
    evidence: null as File | null,
  })

  useEffect(() => {
    if (errors && Object.keys(errors).length > 0) {
      Object.entries(errors).forEach(([field, message]) => {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: `${field}: ${message}`,
        })
      })
    }
  }, [errors])

  const handleSubmit = (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault()

    const formData = new FormData()
    formData.append("registration_number", data.registration_number)
    formData.append("direction", data.direction)
    formData.append("page_count", data.page_count)
    formData.append("is_draft", isDraft.toString())

    if (data.document_type_id) {
      formData.append("document_type_id", data.document_type_id)
    }
    if (data.document_type_text) {
      formData.append("document_type_text", data.document_type_text)
    }
    if (data.title) {
      formData.append("title", data.title)
    }
    if (data.notes) {
      formData.append("notes", data.notes)
    }
    if (data.user_identity) {
      formData.append("user_identity", data.user_identity)
    }
    if (data.issued_date) {
      formData.append("issued_date", data.issued_date.toISOString().split('T')[0])
    }
    if (data.evidence) {
      formData.append("evidence", data.evidence)
    }

    post("/documents", {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        toast({
          title: "Success",
          description: isDraft ? "Document saved as draft" : "Document created successfully",
        })
        reset()
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to ${isDraft ? 'save draft' : 'create document'}. Please check the form.`,
        })
      },
    })
  }

  const handleSaveDraft = (e: React.FormEvent) => {
    handleSubmit(e, true)
  }

  return (
    <AppLayout>
      <Head title="Create Document" />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/documents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Document</h1>
            <p className="text-muted-foreground">Add a new translation document</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
            <CardDescription>Fill in the details for the new document</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Registration Number and Direction */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registration_number">
                    Registration Number <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={data.registration_number}
                    onValueChange={(value) => setData("registration_number", value)}
                  >
                    <SelectTrigger className={`w-full ${errors.registration_number ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select registration number" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRegistrations.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No available registrations</div>
                      ) : (
                        availableRegistrations.map((reg) => (
                          <SelectItem key={reg.id} value={reg.number}>
                            <div className="flex flex-col">
                              <span>{reg.number} ({reg.state})</span>
                              {reg.existing_directions && reg.existing_directions.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Existing: {reg.existing_directions.join(', ')}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.registration_number && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.registration_number}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direction">
                    Translation Direction <span className="text-destructive">*</span>
                  </Label>
                  <Select value={data.direction} onValueChange={(value) => setData("direction", value)}>
                    <SelectTrigger className={`w-full ${errors.direction ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      {directions.map((dir) => (
                        <SelectItem key={dir} value={dir}>
                          {dir === "Indo-Mandarin" ? "Indonesian → Mandarin" :
                            dir === "Mandarin-Indo" ? "Mandarin → Indonesian" :
                              dir === "Indo-Taiwan" ? "Indonesian → Taiwanese" :
                                "Taiwanese → Indonesian"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.direction && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.direction}
                    </p>
                  )}
                </div>
              </div>

              {/* Document Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document_type_id">Document Type (Predefined)</Label>
                  <Select value={data.document_type_id} onValueChange={(value) => setData("document_type_id", value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {types.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document_type_text">Or Custom Type</Label>
                  <Input
                    id="document_type_text"
                    value={data.document_type_text}
                    onChange={(e) => setData("document_type_text", e.target.value)}
                    placeholder="Enter custom type"
                  />
                </div>
              </div>

              {/* Title and Page Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title</Label>
                  <Input
                    id="title"
                    value={data.title}
                    onChange={(e) => setData("title", e.target.value)}
                    placeholder="Enter document title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="page_count">
                    Page Count <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="page_count"
                    type="number"
                    min="1"
                    value={data.page_count}
                    onChange={(e) => setData("page_count", e.target.value)}
                    className={errors.page_count ? "border-destructive" : ""}
                  />
                  {errors.page_count && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.page_count}
                    </p>
                  )}
                </div>
              </div>

              {/* Issued Date */}
              <div className="space-y-2">
                <Label htmlFor="issued_date">Issued Date</Label>
                <DatePicker
                  value={data.issued_date}
                  onChange={(date) => setData("issued_date", date)}
                  placeholder="Pilih tanggal terbit dokumen"
                />
              </div>

              {/* Evidence File */}
              <div className="space-y-2">
                <Label htmlFor="evidence">Evidence File</Label>
                <Input
                  id="evidence"
                  type="file"
                  onChange={(e) => setData("evidence", e.target.files?.[0] || null)}
                  className="cursor-pointer"
                  accept=".pdf,.doc,.docx"
                />
                {data.evidence && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {data.evidence.name}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Accepted: PDF, DOC, DOCX (Max 20MB)</p>
                {errors.evidence && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.evidence}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={data.notes}
                  onChange={(e) => setData("notes", e.target.value)}
                  placeholder="Add any additional notes or comments..."
                  rows={4}
                />
              </div>

              {/* User Identity */}
              <div className="space-y-2">
                <Label htmlFor="user_identity">Identitas Pengguna Jasa</Label>
                <Textarea
                  id="user_identity"
                  value={data.user_identity}
                  onChange={(e) => setData("user_identity", e.target.value)}
                  placeholder="Masukkan identitas pengguna jasa (nama, alamat, dll)..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Informasi identitas lengkap pengguna jasa yang meminta terjemahan
                </p>
              </div>

              {/* Info Alert */}
              <Alert>
                <AlertDescription>
                  You can save as draft to continue later, or submit the document for processing.
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Link href="/documents" className="flex-1">
                  <Button type="button" variant="outline" className="w-full bg-transparent">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={processing}
                  className="flex-1"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  {processing ? "Saving..." : "Save as Draft"}
                </Button>
                <Button type="submit" disabled={processing} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {processing ? "Saving..." : "Submit Document"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
