"use client"

import { Head, Link } from "@inertiajs/react"
import { route } from "ziggy-js"
import AppLayout from "@/Layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, FileText, Calendar, User, Hash, ArrowRight } from "lucide-react"
import { DocumentStatusBadge, DirectionBadge } from "@/components/custom/status-badges"

interface Document {
  id: number
  registration_number: string
  direction: "Indo-Mandarin" | "Mandarin-Indo" | "Indo-Taiwan" | "Taiwan-Indo"
  status: "DRAFT" | "SUBMITTED"
  title: string | null
  document_type_text: string | null
  page_count: number
  notes: string | null
  user_identity: string | null
  issued_date: string | null
  issued_date_formatted?: string | null
  evidence_path: string | null
  evidence_mime: string | null
  evidence_size: number | null
  registration_year: number
  registration_month: number
  registration_seq: number
  created_at: string
  updated_at: string
  owner: {
    id: number
    name: string
  }
  type: {
    id: number
    name: string
  } | null
  registration: {
    id: number
    number: string
  }
  created_by: {
    id: number
    name: string
  } | null
  updated_by: {
    id: number
    name: string
  } | null
}

interface Props {
  document: Document
}

export default function ShowDocument({ document }: Props) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <AppLayout>
      <Head title={`Document ${document.registration_number}`} />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/documents">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Document Details</h1>
              <p className="text-muted-foreground">View document information</p>
            </div>
          </div>
          <DocumentStatusBadge status={document.status} />
        </div>

        {/* Main Information */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{document.title || "Untitled Document"}</CardTitle>
                <CardDescription className="mt-2 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  <span className="font-mono">{document.registration_number}</span>
                </CardDescription>
              </div>
              <DirectionBadge direction={document.direction} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Document Type</div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {document.type?.name || document.document_type_text || "Not specified"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Page Count</div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{document.page_count} pages</span>
                </div>
              </div>
            </div>

            {/* Owner and User Identity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Document Owner</div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{document.owner.name}</span>
                </div>
              </div>

              {document.user_identity && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">User Identity</div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{document.user_identity}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Registration Details and Issued Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Registration Details</div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div className="font-mono text-sm space-y-1">
                    <div className="font-semibold text-base">{document.registration_number}</div>
                    <div className="text-muted-foreground">
                      <div>Year: {document.registration_year}</div>
                      <div>Month: {document.registration_month}</div>
                      <div>Sequence: {document.registration_seq}</div>
                    </div>
                  </div>
                </div>
              </div>

              {document.issued_date && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Issued Date</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {document.issued_date_formatted
                        ? new Date(document.issued_date_formatted).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                        : new Date(document.issued_date).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {document.notes && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Notes</div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{document.notes}</p>
                </div>
              </div>
            )}

            {/* Timestamps and Audit Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Created</div>
                <div className="text-sm space-y-1">
                  <div>
                    {new Date(document.created_at).toLocaleString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {document.created_by && (
                    <div className="text-muted-foreground">
                      by {document.created_by.name}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
                <div className="text-sm space-y-1">
                  <div>
                    {new Date(document.updated_at).toLocaleString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {document.updated_by && (
                    <div className="text-muted-foreground">
                      by {document.updated_by.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evidence File */}
        {document.evidence_path && (
          <Card>
            <CardHeader>
              <CardTitle>Evidence File</CardTitle>
              <CardDescription>Attached document evidence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{document.evidence_path.split("/").pop()}</div>
                    <div className="text-sm text-muted-foreground">
                      {document.evidence_mime} • {formatFileSize(document.evidence_size || 0)}
                    </div>
                  </div>
                </div>
                <a href={route("documents.evidence", document.id)} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/documents" className="flex-1">
            <Button variant="outline" className="w-full bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Documents
            </Button>
          </Link>
          <Link href={`/documents?q=${document.registration_number}`} className="flex-1">
            <Button variant="default" className="w-full">
              View Related Documents
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
