"use client"

import type * as React from "react"
import { Head, useForm, Link, router } from "@inertiajs/react"
import AppLayout from "@/Layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, FileText, Save, AlertCircle, BookOpen } from "lucide-react"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { DatePicker } from "@/components/ui/date-picker"
import { AutocompleteInput } from "@/components/AutocompleteInput"

interface DocumentType {
  id: number
  name: string
}

interface Registration {
  id: number
  number: string
  state: string
}

interface Props {
  types: DocumentType[]
  directions: string[]
  availableRegistrations: Registration[]
  errors?: Record<string, string>
}

export default function CreateDocument({ types, directions, availableRegistrations, errors: _serverErrors }: Props) {
  const { toast } = useToast()
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const { data, setData, processing, reset } = useForm({
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
    if (formErrors && Object.keys(formErrors).length > 0) {
      Object.entries(formErrors).forEach(([field, message]) => {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: `${field}: ${message}`,
        })
      })
    }
  }, [formErrors])

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

    router.post("/documents", formData, {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        setFormErrors({}) // Clear errors on success
        toast({
          title: "Success",
          description: isDraft ? "Document saved as draft" : "Document created successfully",
          variant: "success",
        })
        reset()
      },
      onError: (errors) => {
        setFormErrors(errors) // Set errors from server
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
                    <SelectTrigger className={`w-full ${formErrors.registration_number ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select registration number">
                        {data.registration_number && (
                          <span className="truncate">{data.registration_number}</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableRegistrations.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">No available registrations</div>
                      ) : (
                        availableRegistrations.map((reg) => (
                          <SelectItem key={reg.id} value={reg.number}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{reg.number}</span>
                              <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                Available
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {formErrors.registration_number && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.registration_number}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direction">
                    Translation Direction <span className="text-destructive">*</span>
                  </Label>
                  <Select value={data.direction} onValueChange={(value) => setData("direction", value)}>
                    <SelectTrigger className={`w-full ${formErrors.direction ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      {directions.map((dir) => (
                        <SelectItem key={dir} value={dir}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {dir === "Indo-Mandarin" ? "Indonesian → Mandarin" :
                                dir === "Mandarin-Indo" ? "Mandarin → Indonesian" :
                                  dir === "Indo-Taiwan" ? "Indonesian → Taiwanese" :
                                    "Taiwanese → Indonesian"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {dir === "Indo-Mandarin" ? "Translation from Indonesian to Mandarin" :
                                dir === "Mandarin-Indo" ? "Translation from Mandarin to Indonesian" :
                                  dir === "Indo-Taiwan" ? "Translation from Indonesian to Taiwanese" :
                                    "Translation from Taiwanese to Indonesian"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.direction && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.direction}
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
                    className={formErrors.page_count ? "border-destructive" : ""}
                  />
                  {formErrors.page_count && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.page_count}
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
                  placeholder="Select document issue date"
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
                {formErrors.evidence && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.evidence}
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
              <AutocompleteInput
                id="user_identity"
                label="User Identity"
                value={data.user_identity}
                onChange={(value) => setData("user_identity", value)}
                placeholder="Enter user identity information (name, address, etc.)..."
                suggestionsUrl="/documents/user-identity/suggestions"
              />
              <p className="text-xs text-muted-foreground">
                Complete identity information of the user requesting translation
              </p>

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
