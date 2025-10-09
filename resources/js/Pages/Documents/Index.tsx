"use client"
import { Head, Link } from "@inertiajs/react"
import { useRef, useState } from "react"
import { Plus, MoreHorizontal, Edit, Trash2, Eye, Download, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import AppLayout from "@/Layouts/AppLayout"
import { ColumnDef } from "@tanstack/react-table"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useConfirm } from "@/components/custom"
import { DataTable } from "@/components/DataTable"
import { useActionHandler } from "@/hooks/useActionHandler"
import { useToast } from "@/hooks/use-toast"
import { route } from "ziggy-js"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
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

interface User {
  id: number
  name: string
  role: string
}

interface DocumentsIndexProps {
  isAdmin: boolean
  users: User[]
}

export default function DocumentsIndex({ isAdmin, users }: DocumentsIndexProps) {
  const confirm = useConfirm()
  const { toast } = useToast()
  const dataTableRef = useRef<any>(null)
  const { handleDelete, handleExport, handleBulkDelete } = useActionHandler()

  // Export dialog state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportFilters, setExportFilters] = useState({
    direction: '' as string, // Changed from directions array to single direction
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  })

  // Calendar popover states
  const [isStartDateOpen, setIsStartDateOpen] = useState(false)
  const [isEndDateOpen, setIsEndDateOpen] = useState(false)

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
    // Client/Owner filter (admin only)
    ...(isAdmin ? [{
      key: "owner_user_id",
      label: "Client",
      type: "select" as const,
      placeholder: "Select client",
      options: [
        { label: "All Clients", value: "all" },
        ...users.map(user => ({
          value: user.id.toString(),
          label: `${user.name} (${user.role})`
        }))
      ]
    }] : [])
  ]

  // Action configurations
  const actionConfigs = [
    // Export button (available for both admin and client)
    {
      label: "Export",
      icon: Download,
      variant: "outline" as const,
      size: "sm" as const,
      onClick: (selectedRows?: any[]) => {
        handleExport(selectedRows || [], "documents")
      }
    },
    // Bulk Delete (Admin only)
    ...(isAdmin ? [{
      label: "Bulk Delete",
      icon: Trash2,
      variant: "destructive" as const,
      size: "sm" as const,
      showWhenSelected: true,
      onClick: (selectedRows?: any[]) => {
        handleBulkDelete(selectedRows || [], "documents")
      }
    }] : [])
  ]

  // Handle export with filters
  const handleExportWithFilters = async () => {
    try {
      // Check if direction is selected (admin only)
      if (isAdmin && !exportFilters.direction) {
        toast({
          title: "No Direction Selected",
          description: "Please select a direction to export documents.",
          variant: "destructive",
        })
        return
      }

      const params = new URLSearchParams()

      // Add direction for admin only
      if (isAdmin && exportFilters.direction) {
        params.append('direction', exportFilters.direction)
      }

      if (exportFilters.startDate) {
        params.append('start_date', exportFilters.startDate.toISOString().split('T')[0])
      }
      if (exportFilters.endDate) {
        params.append('end_date', exportFilters.endDate.toISOString().split('T')[0])
      }

      const url = `/export/documents?${params.toString()}`

      // Use fetch to check for errors before opening window
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // If successful, open the download
      window.open(url, '_blank')
      setIsExportDialogOpen(false)

      // Show success toast
      toast({
        title: "Export Successful",
        description: "Documents have been exported successfully.",
        variant: "success",
      })

      // Reset filters
      setExportFilters({
        direction: '',
        startDate: undefined,
        endDate: undefined,
      })

      // Reset calendar states
      setIsStartDateOpen(false)
      setIsEndDateOpen(false)
    } catch (error: any) {
      console.error('Export error:', error)
      toast({
        title: "Export Failed",
        description: error.message || 'Failed to export documents',
        variant: "destructive",
      })
    }
  }

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
          <div className="flex gap-2">
            <Dialog open={isExportDialogOpen} onOpenChange={(open) => {
              setIsExportDialogOpen(open)
              if (!open) {
                // Reset calendar states when dialog closes
                setIsStartDateOpen(false)
                setIsEndDateOpen(false)
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export Documents
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Export Documents</DialogTitle>
                  <DialogDescription>
                    {isAdmin
                      ? "Select filters to export submitted documents. Only documents with SUBMITTED status will be exported."
                      : "Export your submitted documents. Only documents with SUBMITTED status will be exported."
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Direction filter - Admin only */}
                  {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="direction">
                        Arah Terjemahan <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={exportFilters.direction}
                        onValueChange={(value) => {
                          setExportFilters(prev => ({
                            ...prev,
                            direction: value
                          }))
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih arah terjemahan" />
                        </SelectTrigger>
                        <SelectContent className="max-w-md">
                          <SelectItem value="indo-mandarin">
                            <div className="flex flex-col gap-0.5 py-1">
                              <span className="font-semibold text-sm">Indo → Mandarin</span>
                              <span className="text-xs text-muted-foreground line-clamp-2">
                                Export: Indo-Mandarin + Indo-Taiwan
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="mandarin-indo">
                            <div className="flex flex-col gap-0.5 py-1">
                              <span className="font-semibold text-sm">Mandarin → Indo</span>
                              <span className="text-xs text-muted-foreground line-clamp-2">
                                Export: Mandarin-Indo + Taiwan-Indo
                              </span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-amber-600 line-clamp-2">
                        Taiwan variants akan otomatis di-include dan ditampilkan sebagai Mandarin
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="startDate">
                      Tanggal Mulai (Opsional)
                    </Label>
                    <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !exportFilters.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {exportFilters.startDate ? format(exportFilters.startDate, "PPP") : "Pilih tanggal mulai"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={exportFilters.startDate}
                          onSelect={(date) => {
                            setExportFilters(prev => ({ ...prev, startDate: date }))
                            setIsStartDateOpen(false)
                          }}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">
                      Tanggal Selesai (Opsional)
                    </Label>
                    <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !exportFilters.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {exportFilters.endDate ? format(exportFilters.endDate, "PPP") : "Pilih tanggal selesai"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={exportFilters.endDate}
                          onSelect={(date) => {
                            setExportFilters(prev => ({ ...prev, endDate: date }))
                            setIsEndDateOpen(false)
                          }}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleExportWithFilters}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Link href={route("documents.create")}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Document
              </Button>
            </Link>
          </div>
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