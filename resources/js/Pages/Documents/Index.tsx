"use client"
import { Head, Link } from "@inertiajs/react"
import { useRef } from "react"
import { Plus, MoreHorizontal, Edit, Trash2, Eye, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import AppLayout from "@/Layouts/AppLayout"
import { ColumnDef } from "@tanstack/react-table"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useConfirm } from "@/components/custom"
import { DataTable } from "@/components/DataTable"
import { useActionHandler } from "@/hooks/useActionHandler"
import { route } from "ziggy-js"
import { DocumentStatusBadge, DirectionBadge } from "@/components/custom/status-badges"

interface Document {
  id: number
  registration_number: string
  direction: "Indo-Mandarin" | "Mandarin-Indo" | "Indo-Taiwan" | "Taiwan-Indo"
  status: "DRAFT" | "SUBMITTED"
  title: string | null
  document_type_text: string | null
  page_count: number
  evidence_path: string | null
  user_identity: string | null
  created_at: string
  owner: {
    id: number
    name: string
  }
  type: string | null // DataTables returns this as a string, not an object
  registration: {
    id: number
    number: string
  }
}

interface DocumentsIndexProps {
  isAdmin: boolean
}

export default function DocumentsIndex({ isAdmin }: DocumentsIndexProps) {
  const confirm = useConfirm()
  const dataTableRef = useRef<any>(null)
  const { handleDelete, handleExport, handleBulkDelete } = useActionHandler()

  // Column definitions
  const columns: ColumnDef<Document>[] = [
    {
      accessorKey: "registration_number",
      header: "Registration Number",
      cell: ({ row }) => (
        <div className="font-mono font-medium text-sm">{row.getValue("registration_number")}</div>
      ),
    },
    {
      accessorKey: "title",
      header: "Title & Type",
      cell: ({ row }) => {
        const document = row.original
        const title = row.getValue("title") as string | null
        // Fix: document.type is a string, not an object with .name property
        const typeName = document.type || document.document_type_text

        return (
          <div className="max-w-[250px]">
            <div className="font-medium text-sm truncate">
              {title || <span className="text-muted-foreground italic">No title</span>}
            </div>
            {typeName && (
              <div className="text-xs text-muted-foreground truncate">
                {typeName}
              </div>
            )}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "direction",
      header: "Direction",
      cell: ({ row }: { row: any }) => {
        const direction = row.getValue("direction") as "Indo-Mandarin" | "Mandarin-Indo" | "Indo-Taiwan" | "Taiwan-Indo"
        return <DirectionBadge direction={direction} />
      },
      enableSorting: false,
    },
    {
      accessorKey: "page_count",
      header: "Pages",
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue("page_count")}</div>
      ),
    },
    ...(isAdmin ? [{
      accessorKey: "owner",
      header: "Owner & Identity",
      cell: ({ row }: { row: any }) => {
        const document = row.original
        const userIdentity = document.user_identity

        return (
          <div className="max-w-[200px]">
            <div className="text-sm font-medium">{document.owner.name}</div>
            {userIdentity && (
              <div className="text-xs text-muted-foreground truncate">
                {userIdentity}
              </div>
            )}
          </div>
        )
      },
      enableSorting: false,
    }] : []),
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: any }) => {
        const status = row.getValue("status") as "DRAFT" | "SUBMITTED"
        return <DocumentStatusBadge status={status} />
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const document = row.original
        const docTitle = document.title || document.registration_number

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={route("documents.show", document.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={route("documents.edit", document.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const ok = await confirm({
                    title: "Delete Document",
                    description: `Are you sure you want to delete document ${docTitle}? This action cannot be undone.`,
                    confirmText: "Delete",
                  })
                  if (ok) {
                    handleDelete(document.id, route("documents.destroy", document.id), `Document ${docTitle}`, {
                      onSuccess: () => dataTableRef.current?.reload()
                    })
                  }
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Filter configurations
  const filterConfigs = [
    {
      key: "direction",
      label: "Direction",
      type: "select" as const,
      placeholder: "Select direction",
      options: [
        { label: "All Directions", value: "all" },
        { value: "ID->ZH", label: "ID → ZH" },
        { value: "ZH->ID", label: "ZH → ID" }
      ]
    },
    {
      key: "status",
      label: "Status",
      type: "select" as const,
      placeholder: "Select status",
      options: [
        { label: "All Status", value: "all" },
        { value: "DRAFT", label: "Draft" },
        { value: "SUBMITTED", label: "Submitted" }
      ]
    },
  ]

  // Action configurations (Admin only)
  const actionConfigs = isAdmin ? [
    {
      label: "Export",
      icon: Download,
      variant: "outline" as const,
      size: "sm" as const,
      onClick: (selectedRows?: any[]) => {
        handleExport(selectedRows || [], "documents")
      }
    },
    {
      label: "Bulk Delete",
      icon: Trash2,
      variant: "destructive" as const,
      size: "sm" as const,
      showWhenSelected: true,
      onClick: (selectedRows?: any[]) => {
        handleBulkDelete(selectedRows || [], "documents")
      }
    }
  ] : []

  return (
    <AppLayout>
      <Head title="Documents" />

      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Document Management</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
            <p className="text-muted-foreground">
              Manage and track all translation documents
            </p>
          </div>
          <Link href={route("documents.create")}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Document
            </Button>
          </Link>
        </div>

        <Separator />

        <DataTable
          ref={dataTableRef}
          columns={columns}
          mode="yajra"
          apiUrl={route("documents.index")}
          dtColumns={["id", "registration_number", "title", "direction", "status", "page_count", "user_identity", "created_at", "updated_at", "owner", "type", "registration"]}
          searchPlaceholder="Search documents..."
          filters={filterConfigs}
          actions={actionConfigs}
          showRowSelection={true}
          showColumnVisibility={true}
          showPagination={true}
          emptyMessage="No documents found."
          pageSize={10}
        />
      </div>
    </AppLayout>
  )
}