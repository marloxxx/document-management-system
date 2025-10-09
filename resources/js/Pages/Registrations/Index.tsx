"use client"
import { Head, Link } from "@inertiajs/react"
import { useRef, useState } from "react"
import { Plus, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import AppLayout from "@/Layouts/AppLayout"
import { ColumnDef } from "@tanstack/react-table"
import { Separator } from "@/components/ui/separator"
import { DataTable } from "@/components/DataTable"
import { makeAPIRequest, handleAPIResponse } from "@/utils/api"
import { useToast } from "@/hooks/use-toast"
import { route } from "ziggy-js"
import { RegistrationStateBadge } from "@/components/custom/status-badges"

interface Registration {
  id: number
  number: string
  year: number
  month: number
  seq: number
  state: "ISSUED" | "COMMITTED" | "VOID"
  created_at: string
  issued_to: {
    id: number
    name: string
  } | null
  documents: Array<{
    id: number
    direction: string
    title: string | null
    status: string
  }> | null
}

interface Props {
  registrations?: Registration[]
  filters?: {
    q?: string
  }
  errors?: Record<string, string>
}

export default function RegistrationsIndex({ }: Props) {
  const dataTableRef = useRef<any>(null)
  const { toast } = useToast()
  const [isIssuing, setIsIssuing] = useState(false)

  const handleIssueNumber = async () => {
    setIsIssuing(true)
    try {
      const response = await makeAPIRequest(route("registrations.issue"), {
        method: "POST",
      })

      const data = await handleAPIResponse(response)

      toast({
        title: "Success",
        description: `Registration number ${data.number} has been issued successfully.`,
        variant: "success",
      })

      // Refresh the data table with a small delay to ensure backend transaction is committed
      setTimeout(() => {
        dataTableRef.current?.reload()
      }, 100)
    } catch (error) {
      console.error('Issue number error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: (error as Error).message || "Failed to issue registration number. Please try again.",
      })
    } finally {
      setIsIssuing(false)
    }
  }

  // Column definitions
  const columns: ColumnDef<Registration>[] = [
    {
      accessorKey: "number",
      header: "Registration Number",
      cell: ({ row }) => (
        <div className="font-mono font-medium text-sm">{row.getValue("number")}</div>
      ),
    },
    {
      accessorKey: "issued_to",
      header: "Issued To",
      cell: ({ row }) => {
        const registration = row.original
        return (
          <div className="text-sm">
            {registration.issued_to ? (
              <span className="font-medium">{registration.issued_to.name}</span>
            ) : (
              <span className="text-muted-foreground italic">Unknown User</span>
            )}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "state",
      header: "State",
      cell: ({ row }) => {
        const state = row.getValue("state") as "ISSUED" | "COMMITTED" | "VOID"
        return <RegistrationStateBadge state={state} />
      },
      enableSorting: false,
    },
    {
      accessorKey: "documents",
      header: "Documents",
      cell: ({ row }) => {
        const registration = row.original
        const documents = Array.isArray(registration.documents) ? registration.documents : []
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{documents.length} / 1</span>
            {documents.length > 0 && (
              <div className="flex gap-1">
                {documents.map((doc) => (
                  <Link
                    key={doc.id}
                    href={route("documents.show", doc.id)}
                    className="text-xs text-primary hover:underline"
                  >
                    <Eye className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "created_at",
      header: "Issued Date",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return (
          <div className="text-sm">
            {date.toLocaleDateString("id-ID", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        )
      },
    },
  ]

  return (
    <AppLayout>
      <Head title="Registrations" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Registrations</h1>
            <p className="text-muted-foreground">Manage registration numbers for documents</p>
          </div>
          <Button onClick={handleIssueNumber} disabled={isIssuing}>
            <Plus className="mr-2 h-4 w-4" />
            {isIssuing ? "Issuing..." : "Issue Number"}
          </Button>
        </div>

        <Separator />

        {/* Registrations Table */}
        <DataTable
          ref={dataTableRef}
          columns={columns}
          mode="yajra"
          apiUrl={route("registrations.index")}
          dtColumns={["id", "number", "year", "month", "seq", "state", "issued_to_user_id", "created_at", "issued_to", "documents"]}
          searchPlaceholder="Search registrations..."
          emptyMessage="No registrations found."
          showColumnVisibility={true}
          showPagination={true}
          pageSize={15}
        />
      </div>
    </AppLayout>
  )
}
