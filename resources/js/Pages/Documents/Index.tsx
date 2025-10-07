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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
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

interface DocumentsIndexProps {
  isAdmin: boolean
}

export default function DocumentsIndex({ isAdmin }: DocumentsIndexProps) {
  const confirm = useConfirm()
  const { toast } = useToast()
  const dataTableRef = useRef<any>(null)
  const { handleDelete, handleExport, handleBulkDelete } = useActionHandler()

  // Export dialog state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportFilters, setExportFilters] = useState({
    directions: [] as string[],
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

  // Handle export with filters
  const handleExportWithFilters = async () => {
    try {
      // Validate direction compatibility
      if (exportFilters.directions.length > 1) {
        const compatibleGroups = [
          ['mandarin-indo', 'taiwan-indo'],
          ['indo-mandarin', 'indo-taiwan'],
        ]

        let isCompatible = false
        for (const group of compatibleGroups) {
          // Check if all selected directions are in the same compatible group
          if (exportFilters.directions.every(dir => group.includes(dir))) {
            isCompatible = true
            break
          }
        }

        if (!isCompatible) {
          toast({
            title: "Invalid Direction Selection",
            description: "Selected directions are incompatible. You can only export documents with compatible directions: Mandarin-Indo + Taiwan-Indo OR Indo-Mandarin + Indo-Taiwan.",
            variant: "destructive",
          })
          return
        }
      }

      // Check if at least one direction is selected
      if (exportFilters.directions.length === 0) {
        toast({
          title: "No Directions Selected",
          description: "Please select at least one direction to export documents.",
          variant: "destructive",
        })
        return
      }

      const params = new URLSearchParams()

      if (exportFilters.directions.length > 0) {
        exportFilters.directions.forEach(direction => {
          params.append('directions[]', direction)
        })
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
        directions: [],
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
            {isAdmin && (
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
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Export Documents</DialogTitle>
                    <DialogDescription>
                      Select filters to export submitted documents. Only documents with SUBMITTED status will be exported.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="directions" className="text-right pt-2">
                        Directions
                      </Label>
                      <div className="col-span-3 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Select compatible directions. Incompatible options will be disabled automatically:
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="mandarin-indo"
                              checked={exportFilters.directions.includes('mandarin-indo')}
                              disabled={exportFilters.directions.some(d => ['indo-mandarin', 'indo-taiwan'].includes(d))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setExportFilters(prev => ({
                                    ...prev,
                                    directions: [...prev.directions, 'mandarin-indo']
                                  }))
                                } else {
                                  setExportFilters(prev => ({
                                    ...prev,
                                    directions: prev.directions.filter(d => d !== 'mandarin-indo')
                                  }))
                                }
                              }}
                            />
                            <Label htmlFor="mandarin-indo" className={`text-sm ${exportFilters.directions.some(d => ['indo-mandarin', 'indo-taiwan'].includes(d)) ? 'text-muted-foreground' : ''}`}>
                              Mandarin - Indo
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="taiwan-indo"
                              checked={exportFilters.directions.includes('taiwan-indo')}
                              disabled={exportFilters.directions.some(d => ['indo-mandarin', 'indo-taiwan'].includes(d))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setExportFilters(prev => ({
                                    ...prev,
                                    directions: [...prev.directions, 'taiwan-indo']
                                  }))
                                } else {
                                  setExportFilters(prev => ({
                                    ...prev,
                                    directions: prev.directions.filter(d => d !== 'taiwan-indo')
                                  }))
                                }
                              }}
                            />
                            <Label htmlFor="taiwan-indo" className={`text-sm ${exportFilters.directions.some(d => ['indo-mandarin', 'indo-taiwan'].includes(d)) ? 'text-muted-foreground' : ''}`}>
                              Taiwan - Indo
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="indo-mandarin"
                              checked={exportFilters.directions.includes('indo-mandarin')}
                              disabled={exportFilters.directions.some(d => ['mandarin-indo', 'taiwan-indo'].includes(d))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setExportFilters(prev => ({
                                    ...prev,
                                    directions: [...prev.directions, 'indo-mandarin']
                                  }))
                                } else {
                                  setExportFilters(prev => ({
                                    ...prev,
                                    directions: prev.directions.filter(d => d !== 'indo-mandarin')
                                  }))
                                }
                              }}
                            />
                            <Label htmlFor="indo-mandarin" className={`text-sm ${exportFilters.directions.some(d => ['mandarin-indo', 'taiwan-indo'].includes(d)) ? 'text-muted-foreground' : ''}`}>
                              Indo - Mandarin
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="indo-taiwan"
                              checked={exportFilters.directions.includes('indo-taiwan')}
                              disabled={exportFilters.directions.some(d => ['mandarin-indo', 'taiwan-indo'].includes(d))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setExportFilters(prev => ({
                                    ...prev,
                                    directions: [...prev.directions, 'indo-taiwan']
                                  }))
                                } else {
                                  setExportFilters(prev => ({
                                    ...prev,
                                    directions: prev.directions.filter(d => d !== 'indo-taiwan')
                                  }))
                                }
                              }}
                            />
                            <Label htmlFor="indo-taiwan" className={`text-sm ${exportFilters.directions.some(d => ['mandarin-indo', 'taiwan-indo'].includes(d)) ? 'text-muted-foreground' : ''}`}>
                              Indo - Taiwan
                            </Label>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Compatible combinations: Mandarin-Indo + Taiwan-Indo OR Indo-Mandarin + Indo-Taiwan
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="startDate" className="text-right">
                        Start Date
                      </Label>
                      <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "col-span-3 justify-start text-left font-normal",
                              !exportFilters.startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {exportFilters.startDate ? format(exportFilters.startDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 z-[100]"
                          align="start"
                          onInteractOutside={(e) => {
                            // Prevent closing when clicking inside the calendar
                            e.preventDefault()
                          }}
                          style={{ pointerEvents: 'auto' }}
                        >
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
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="endDate" className="text-right">
                        End Date
                      </Label>
                      <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "col-span-3 justify-start text-left font-normal",
                              !exportFilters.endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {exportFilters.endDate ? format(exportFilters.endDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0 z-[100]"
                          align="start"
                          onInteractOutside={(e) => {
                            // Prevent closing when clicking inside the calendar
                            e.preventDefault()
                          }}
                          style={{ pointerEvents: 'auto' }}
                        >
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
            )}
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