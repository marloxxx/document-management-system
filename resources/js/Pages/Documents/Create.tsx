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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null)

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

  // Update selected registration when registration number changes
  useEffect(() => {
    if (data.registration_number) {
      const reg = availableRegistrations.find(r => r.number === data.registration_number)
      setSelectedRegistration(reg || null)

      // Auto-select opposite direction for PARTIAL status
      if (reg && reg.state === 'PARTIAL' && reg.existing_directions && reg.existing_directions.length > 0) {
        const existingDirection = reg.existing_directions[0] // Get the first existing direction
        const oppositeDirection = getOppositeDirection(existingDirection)
        if (oppositeDirection && !data.direction) {
          setData("direction", oppositeDirection)
        }
      }
    } else {
      setSelectedRegistration(null)
    }
  }, [data.registration_number, availableRegistrations])

  // Helper function to get opposite direction
  const getOppositeDirection = (direction: string): string | null => {
    const oppositeMap: Record<string, string> = {
      'Indo-Mandarin': 'Mandarin-Indo',
      'Mandarin-Indo': 'Indo-Mandarin',
      'Indo-Taiwan': 'Taiwan-Indo',
      'Taiwan-Indo': 'Indo-Taiwan'
    }
    return oppositeMap[direction] || null
  }

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
                            <div className="flex flex-col min-w-0 w-full">
                              <span className="font-medium truncate">{reg.number}</span>
                              <div className="flex items-center gap-2 text-xs">
                                <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${reg.state === 'ISSUED' ? 'bg-green-100 text-green-800' :
                                  reg.state === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                  {reg.state === 'ISSUED' ? 'New' :
                                    reg.state === 'PARTIAL' ? 'Partial' : reg.state}
                                </span>
                              </div>
                              {reg.existing_directions && reg.existing_directions.length > 0 && (
                                <span className="text-xs text-muted-foreground mt-1 truncate">
                                  Existing: {reg.existing_directions.map(dir => {
                                    const directionMap: Record<string, string> = {
                                      'ID->ZH': 'Indonesia → Mandarin',
                                      'ZH->ID': 'Mandarin → Indonesia',
                                      'ID->TW': 'Indonesia → Taiwan',
                                      'TW->ID': 'Taiwan → Indonesia'
                                    }
                                    return directionMap[dir] || dir
                                  }).join(', ')}
                                </span>
                              )}
                              {reg.state === 'PARTIAL' && (
                                <span className="text-xs text-blue-600 mt-1 truncate">
                                  ✓ Available for opposite language direction
                                </span>
                              )}
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

                  {/* Additional information for PARTIAL status */}
                  {selectedRegistration && selectedRegistration.state === 'PARTIAL' && (
                    <Alert className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <p className="font-medium text-yellow-800">Registration Status: Partial</p>
                          <p className="text-sm text-yellow-700">
                            This registration number has been used for one direction.
                            You can create another document with the opposite direction.
                          </p>
                          {selectedRegistration.existing_directions && selectedRegistration.existing_directions.length > 0 && (
                            <div className="text-sm text-yellow-700">
                              <span className="font-medium">Existing directions:</span>{" "}
                              {selectedRegistration.existing_directions.map(dir => {
                                const directionMap: Record<string, string> = {
                                  'ID->ZH': 'Indonesia → Mandarin',
                                  'ZH->ID': 'Mandarin → Indonesia',
                                  'ID->TW': 'Indonesia → Taiwan',
                                  'TW->ID': 'Taiwan → Indonesia'
                                }
                                return directionMap[dir] || dir
                              }).join(', ')}
                            </div>
                          )}
                          {data.direction && (
                            <div className="text-sm text-green-700 font-medium">
                              ✓ Translation direction automatically selected: {
                                (() => {
                                  const directionMap: Record<string, string> = {
                                    'ID->ZH': 'Indonesia → Mandarin',
                                    'ZH->ID': 'Mandarin → Indonesia',
                                    'ID->TW': 'Indonesia → Taiwan',
                                    'TW->ID': 'Taiwan → Indonesia'
                                  }
                                  return directionMap[data.direction] || data.direction
                                })()
                              }
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
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
