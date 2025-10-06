import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
    useImperativeHandle,
    forwardRef,
    type Ref,
} from 'react'
import { usePage } from '@inertiajs/react'
import {
    ColumnDef,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table'
import {
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    Filter as FilterIcon,
    Search,
    X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CustomSelect } from '@/components/custom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/**
 * DataTable Component — Yajra (server-side) + Client-side (à la DataTables.net)
 * - mode="yajra": kirim/terima format Yajra DataTables (Laravel)
 * - mode="client": operasi (search, sort, paginate) di client pakai TanStack
 */

export interface FilterConfig {
    key: string
    label: string
    type: 'select' | 'text' | 'date' | 'input'
    options?: { label: string; value: string }[]
    placeholder?: string
    defaultValue?: string
}

export interface ActionConfig {
    label: string
    icon: any
    variant?: 'default' | 'outline' | 'destructive' | 'secondary'
    size?: 'sm' | 'default'
    showWhenSelected?: boolean
    onClick: (selectedRowIds?: any[]) => void
}

export type DataTableHandle = {
    reload: () => void
    reloadWithParams: (params: any) => void
}

export interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    mode?: 'yajra' | 'client'
    data?: TData[]

    searchPlaceholder?: string
    showColumnVisibility?: boolean
    showPagination?: boolean
    showRowSelection?: boolean
    emptyMessage?: string
    pageSize?: number
    pageSizeOptions?: number[]
    filters?: FilterConfig[]
    actions?: ActionConfig[]
    className?: string

    /** SERVER-SIDE YAJRA */
    apiUrl?: string
    dtColumns?: string[]
    requestMethod?: 'GET' | 'POST'
    withCredentials?: boolean

    // optional callbacks
    pagination?: {
        current_page: number
        last_page: number
        per_page: number
        total: number
        from: number
        to: number
        page?: number
    }
    onDataChange?: (data: any) => void
    onPaginationChange?: (pagination: any) => void
}

function DataTableInner<TData, TValue>(
    {
        columns,
        mode = 'yajra',
        data = [],
        searchPlaceholder = 'Search...',
        showColumnVisibility = true,
        showPagination = true,
        showRowSelection = false,
        emptyMessage = 'No data found.',
        pageSize = 10,
        pageSizeOptions = [10, 25, 50, 100],
        filters = [],
        actions = [],
        className,

        // Yajra-only props
        apiUrl,
        dtColumns = [],
        requestMethod = 'GET',
        withCredentials = true,

        // optional
        pagination,
        onDataChange,
        onPaginationChange,
    }: DataTableProps<TData, TValue>,
    ref: Ref<DataTableHandle>,
) {
    const isClient = mode === 'client'
    const { csrf_token } = usePage().props as any

    // ===== UI states =====
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

    // Search state
    const [searchTerm, setSearchTerm] = useState('')          // server (debounced)
    const [clientGlobalFilter, setClientGlobalFilter] = useState('') // client

    // Filters (server)
    const [filterValues, setFilterValues] = useState<Record<string, any>>({})
    const initialFilterValues = useMemo(
        () =>
            (filters || []).reduce((acc, f) => {
                acc[f.key] = f.defaultValue ?? 'all'
                return acc
            }, {} as Record<string, any>),
        [filters],
    )

    // Loading
    const [isLoading, setIsLoading] = useState(false)

    // Server states
    const [serverData, setServerData] = useState<TData[]>(data)
    const [serverPagination, setServerPagination] = useState(pagination)
    const [serverSorting, setServerSorting] = useState<{ column: string; direction: string }>(() => {
        const defaultCol = dtColumns?.includes('created_at') ? 'created_at' : dtColumns?.[0]
        return { column: defaultCol || 'id', direction: 'desc' }
    })
    const mountedRef = useRef(false)

    // Client pagination state
    const [clientPageSize, setClientPageSize] = useState(pageSize)

    // Refs
    const serverSortingRef = useRef(serverSorting)
    const serverPaginationRef = useRef(serverPagination)
    const lastStableKeyRef = useRef<string>('') // <— perbaiki bug: jangan pakai reqId buat key
    const drawRef = useRef(1)

    // Race control
    const abortRef = useRef<AbortController | null>(null)
    const requestSeqRef = useRef(0)
    const latestAppliedRef = useRef(0)

    useEffect(() => {
        serverSortingRef.current = serverSorting
    }, [serverSorting])
    useEffect(() => {
        serverPaginationRef.current = serverPagination
    }, [serverPagination])

    const shallowEqual = (a: any, b: any) => {
        const aKeys = Object.keys(a || {})
        const bKeys = Object.keys(b || {})
        if (aKeys.length !== bKeys.length) return false
        for (const k of aKeys) if (a[k] !== b[k]) return false
        return true
    }

    // ===== Helpers =====
    const buildYajraParams = useCallback(
        (req: any, method: string = requestMethod) => {
            if (!dtColumns || dtColumns.length === 0) {
                if (process.env.NODE_ENV !== 'production') {
                    console.error('[DataTable] dtColumns wajib diisi (Yajra)')
                }
            }

            const p = new URLSearchParams()

            const length = req.pagination?.per_page || pageSize
            const page = req.pagination?.page || 1
            const start = Math.max(0, (page - 1) * length)

            const sortColKey = req.sorting?.column || serverSortingRef.current.column || dtColumns?.[0]
            const orderIdx = Math.max(0, (dtColumns || []).indexOf(sortColKey))
            const orderDir = req.sorting?.direction || serverSortingRef.current.direction || 'desc'

            // draw, paging, search
            p.append('draw', String(drawRef.current++))
            p.append('start', String(start))
            p.append('length', String(length))
            p.append('search[value]', req.search ?? '')
            p.append('search[regex]', 'false')

                // columns[]
                ; (dtColumns || []).forEach((col, i) => {
                    p.append(`columns[${i}][data]`, col)
                    p.append(`columns[${i}][name]`, col)
                    p.append(`columns[${i}][searchable]`, 'true')
                    p.append(`columns[${i}][orderable]`, 'true')
                    p.append(`columns[${i}][search][value]`, '')
                    p.append(`columns[${i}][search][regex]`, 'false')
                })

            // order[]
            p.append('order[0][column]', String(orderIdx))
            p.append('order[0][dir]', orderDir)

            // custom filters
            Object.entries(req.filters || {}).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '' && value !== 'all') {
                    let stringValue: string
                    if (typeof value === 'object' && value !== null) {
                        stringValue = JSON.stringify(value)
                    } else {
                        stringValue = String(value)
                    }
                    p.append(key, stringValue)
                }
            })

            // cache buster
            p.append('_ts', String(Date.now()))

            // CSRF token hanya untuk POST
            if (csrf_token && method === 'POST') {
                p.append('_token', csrf_token)
            }

            return p
        },
        [csrf_token, dtColumns, pageSize, requestMethod],
    )

    // Buat key stabil untuk dedupe request (tanpa __reqId/__forceReload)
    const toStableKey = useCallback(
        (req: any) => {
            const base = {
                search: req.search ?? '',
                filters: req.filters ?? {},
                sorting: req.sorting ?? serverSortingRef.current,
                pagination: {
                    page: req.pagination?.page ?? 1,
                    per_page: req.pagination?.per_page ?? pageSize,
                },
            }
            return JSON.stringify(base)
        },
        [pageSize],
    )

    const fetchServerData = useCallback(
        async (req: any = {}) => {
            if (!apiUrl || !dtColumns || dtColumns.length === 0) return

            const reqId = ++requestSeqRef.current

            // Batalkan request sebelumnya
            abortRef.current?.abort()
            const controller = new AbortController()
            abortRef.current = controller

            const stableKey = toStableKey(req)
            if (lastStableKeyRef.current === stableKey && !req.__forceReload) return

            setIsLoading(true)
            try {
                const params = buildYajraParams(req)
                const url = requestMethod === 'GET' ? `${apiUrl}?${params.toString()}` : apiUrl

                const response = await fetch(url, {
                    method: requestMethod,
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        ...(csrf_token && requestMethod === 'POST' ? { 'X-CSRF-TOKEN': csrf_token } : {}),
                        ...(requestMethod === 'POST'
                            ? { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }
                            : {}),
                        'Cache-Control': 'no-store',
                    },
                    credentials: withCredentials ? 'same-origin' : 'omit',
                    signal: controller.signal,
                    ...(requestMethod === 'POST' ? { body: params } : {}),
                })

                if (controller.signal.aborted) return
                if (!response.ok) throw new Error(`HTTP ${response.status}`)

                const result = await response.json()

                // urutan respons
                if (reqId < latestAppliedRef.current) return

                // Yajra: { draw, recordsTotal, recordsFiltered, data: [] }
                const length = req.pagination?.per_page || pageSize
                const page = req.pagination?.page || 1
                const total = (result.recordsFiltered ?? result.recordsTotal ?? 0) as number
                const lastPage = Math.max(1, Math.ceil(total / (length || 1)))
                const from = total > 0 ? (page - 1) * length + 1 : 0
                const to = Math.min(total, page * length)

                setServerData(result.data || [])
                const nextPag = {
                    current_page: page,
                    last_page: lastPage,
                    per_page: length,
                    total,
                    from,
                    to,
                }
                setServerPagination(nextPag)

                onDataChange?.(result.data)
                onPaginationChange?.(nextPag)

                latestAppliedRef.current = reqId
                lastStableKeyRef.current = stableKey
            } catch (error: any) {
                if (error?.name !== 'AbortError') {
                    console.error('Error fetching data:', error)
                }
            } finally {
                if (reqId === requestSeqRef.current) setIsLoading(false)
            }
        },
        [apiUrl, dtColumns, pageSize, requestMethod, withCredentials, onDataChange, onPaginationChange, csrf_token, buildYajraParams, toStableKey],
    )

    // ===== Exposed methods =====
    useImperativeHandle(
        ref,
        () => ({
            reload: () => {
                if (isClient) {
                    setClientGlobalFilter('')
                } else {
                    const paging = serverPaginationRef.current || { page: 1, per_page: pageSize }
                    fetchServerData({
                        search: searchTerm,
                        filters: filterValues,
                        sorting: serverSortingRef.current,
                        pagination: paging,
                        __forceReload: true,
                    })
                }
            },
            reloadWithParams: (customParams: any) => {
                if (isClient) return
                fetchServerData({ ...customParams, __forceReload: true })
            },
        }),
        [fetchServerData, pageSize, searchTerm, filterValues, isClient],
    )

    // ===== Debounced search (server) =====
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)
    useEffect(() => {
        if (!isClient) {
            const t = setTimeout(() => setDebouncedSearch(searchTerm), 500)
            return () => clearTimeout(t)
        }
    }, [searchTerm, isClient])

    useEffect(() => {
        if (!isClient && mountedRef.current && apiUrl && dtColumns.length > 0) {
            const paging = serverPaginationRef.current || { page: 1, per_page: pageSize }
            fetchServerData({
                search: debouncedSearch,
                filters: filterValues,
                sorting: serverSortingRef.current,
                pagination: { ...paging, page: 1 },
            })
        }
    }, [debouncedSearch, fetchServerData, pageSize, filterValues, isClient, apiUrl, dtColumns.length])

    // ===== Filters (server) =====
    const handleFilterChange = useCallback((key: string, value: any) => {
        setFilterValues((prev) => {
            const next = { ...prev, [key]: value }
            if (shallowEqual(next, prev)) return prev

            if (!isClient) {
                const paging = serverPaginationRef.current || { page: 1, per_page: pageSize }
                fetchServerData({
                    search: searchTerm,
                    filters: next,
                    sorting: serverSortingRef.current,
                    pagination: { ...paging, page: 1 },
                })
            }
            return next
        })
    }, [fetchServerData, isClient, pageSize, searchTerm])

    const handleClearAllFilters = useCallback(() => {
        const cleared = Object.keys(filterValues).reduce((acc, key) => {
            acc[key] = 'all'
            return acc
        }, {} as Record<string, any>)

        setFilterValues(cleared)

        if (!isClient) {
            const paging = serverPaginationRef.current || { page: 1, per_page: pageSize }
            fetchServerData({
                search: searchTerm,
                filters: cleared,
                sorting: serverSortingRef.current,
                pagination: { ...paging, page: 1 },
            })
        }
    }, [filterValues, fetchServerData, isClient, pageSize, searchTerm])

    // ===== Sorting =====
    const handleSortingChange = useCallback((newSorting: SortingState) => {
        setSorting(newSorting)

        if (!isClient) {
            const paging = serverPaginationRef.current || { page: 1, per_page: pageSize }

            if (newSorting.length > 0) {
                const sort = newSorting[0]
                const columnId = String(sort.id)
                const nextServerSorting = { column: columnId, direction: sort.desc ? 'desc' : 'asc' }
                setServerSorting(nextServerSorting)
                fetchServerData({
                    search: searchTerm,
                    filters: filterValues,
                    sorting: nextServerSorting,
                    pagination: paging,
                })
            } else {
                // jika sort direset (unsorted) → pakai default serverSorting
                fetchServerData({
                    search: searchTerm,
                    filters: filterValues,
                    sorting: serverSortingRef.current,
                    pagination: paging,
                })
            }
        }
    }, [fetchServerData, filterValues, isClient, pageSize, searchTerm])

    // ===== Pagination =====
    const handlePaginationChange = useCallback((page: number, perPage: number) => {
        if (!isClient) {
            const next = {
                ...(serverPaginationRef.current || {}),
                page,
                per_page: perPage,
                current_page: page,
            }
            setServerPagination(next as any)
            fetchServerData({
                search: searchTerm,
                filters: filterValues,
                sorting: serverSortingRef.current,
                pagination: next,
            })
        } else {
            setClientPageSize(perPage)
            // page index dihandle oleh TanStack table
        }
    }, [fetchServerData, filterValues, isClient, searchTerm])

    // ===== Table data & columns =====
    const tableData = isClient ? data : serverData

    const tableColumns = useMemo<ColumnDef<TData, any>[]>(() => {
        if (!showRowSelection) return columns
        return [
            {
                id: 'select',
                header: ({ table }: any) => (
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                        className="h-4 w-4"
                        aria-label="Select all rows"
                    />
                ),
                cell: ({ row }: any) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(v) => row.toggleSelected(!!v)}
                        className="h-4 w-4"
                        aria-label="Select row"
                    />
                ),
                enableSorting: false,
                enableHiding: false,
                size: 30,
            },
            ...columns,
        ]
    }, [columns, showRowSelection])

    const table = useReactTable({
        data: tableData,
        columns: tableColumns,
        getCoreRowModel: getCoreRowModel(),

        ...(isClient
            ? {
                getFilteredRowModel: getFilteredRowModel(),
                getSortedRowModel: getSortedRowModel(),
                getPaginationRowModel: getPaginationRowModel(),
                onSortingChange: setSorting,
                onGlobalFilterChange: setClientGlobalFilter,
                state: {
                    sorting,
                    columnVisibility,
                    rowSelection,
                    globalFilter: clientGlobalFilter,
                },
            }
            : {
                onSortingChange: (updaterOrValue: any) => {
                    const next =
                        typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue
                    handleSortingChange(next)
                },
                state: {
                    sorting,
                    columnVisibility,
                    rowSelection,
                },
            }),

        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
    })

    // Sync client page size
    useEffect(() => {
        if (isClient) {
            table.setPageSize(clientPageSize)
            table.setPageIndex(0)
        }
    }, [isClient, clientPageSize, table])

    // Reset page ketika client search berubah
    useEffect(() => {
        if (isClient) table.setPageIndex(0)
    }, [isClient, clientGlobalFilter, table])

    // Initial load (server) - Set initial filter values only
    useEffect(() => {
        if (!isClient && apiUrl && dtColumns.length > 0 && !mountedRef.current) {
            mountedRef.current = true
            setFilterValues(initialFilterValues)
            // Note: Initial fetch is now handled by the debounced search effect below
        }
    }, [isClient, apiUrl, dtColumns.length, initialFilterValues])

    // Jika parent mengubah "pagination" prop dari luar (optional control)
    useEffect(() => {
        if (!isClient && pagination) {
            setServerPagination(pagination as any)
        }
    }, [isClient, pagination])

    // Cleanup abort ketika unmount
    useEffect(() => () => abortRef.current?.abort(), [])

    const selectedRowsCount = Object.keys(rowSelection).length
    const selectedRowIds = useMemo(
        () => table.getSelectedRowModel().rows.map((r) => r.id),
        [table, rowSelection],
    )

    // Client pagination info
    const clientTotal = isClient ? table.getFilteredRowModel().rows.length : 0
    const clientPageIndex = isClient ? table.getState().pagination?.pageIndex ?? 0 : 0
    const clientFrom = isClient && clientTotal > 0 ? clientPageIndex * clientPageSize + 1 : 0
    const clientTo = isClient ? Math.min(clientTotal, (clientPageIndex + 1) * clientPageSize) : 0

    return (
        <div className={`space-y-4 ${className ?? ''}`}>
            {/* Search & Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Search */}
                <div className="flex-1 max-w-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={isClient ? clientGlobalFilter : searchTerm}
                            onChange={(e) =>
                                isClient ? setClientGlobalFilter(e.target.value) : setSearchTerm(e.target.value)
                            }
                            className="pl-10"
                            aria-label="Search table"
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-2 items-center">
                    {/* Filters (server) */}
                    {!isClient && filters.length > 0 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <FilterIcon className="h-4 w-4" />
                                    Filters
                                    {Object.values(filterValues).some((v) => v !== 'all') && (
                                        <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                                            {Object.values(filterValues).filter((v) => v !== 'all').length}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end" autoFocus={false} onOpenAutoFocus={(e) => e.preventDefault()}>
                                <div className="space-y-4">
                                    <div className="font-medium">Filters</div>
                                    <div className="space-y-3">
                                        {filters.map((filter) => (
                                            <div key={filter.key} className="space-y-2">
                                                <CustomSelect
                                                    label={filter.label}
                                                    placeholder={filter.placeholder || filter.label}
                                                    value={filterValues[filter.key] ?? 'all'}
                                                    onValueChange={(value) => handleFilterChange(filter.key, value)}
                                                    options={filter.options || []}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleClearAllFilters} className="w-full">
                                        <X className="h-4 w-4 mr-2" /> Clear All Filters
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}

                    {/* Column Visibility */}
                    {showColumnVisibility && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <FilterIcon className="h-4 w-4 mr-2" />
                                    Columns
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedRowsCount > 0 && actions.filter((a) => a.showWhenSelected).length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                    <div className="text-sm text-muted-foreground">
                        {selectedRowsCount} item{selectedRowsCount > 1 ? 's' : ''} selected
                    </div>
                    <div className="flex gap-2 ml-auto">
                        {actions
                            .filter((a) => a.showWhenSelected)
                            .map((action) => (
                                <Button
                                    key={action.label}
                                    variant={action.variant || 'outline'}
                                    size={action.size || 'sm'}
                                    onClick={() => action.onClick(selectedRowIds)}
                                >
                                    <action.icon className="h-4 w-4 mr-2" />
                                    {action.label}
                                </Button>
                            ))}
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="rounded-lg border">
                <div className="relative w-full overflow-x-auto">
                    <Table className="table-auto w-full [&_*]:break-words [&_*]:overflow-wrap-anywhere">
                        <colgroup>
                            {table.getAllLeafColumns().map((col) => {
                                const meta = (col.columnDef as any)?.meta || {}
                                const style: React.CSSProperties = {}

                                // Deteksi dinamis untuk kolom compact
                                const isCheckbox = col.id === 'select'
                                const isAction = col.id === 'actions'
                                const isStatus = col.id === 'is_active' || col.id === 'scan_status' || col.id === 'status'
                                const isCount = col.id.includes('_count') || col.id.includes('count')
                                const isIconCol = isCheckbox || isAction || isStatus || isCount

                                // width angka -> px; kolom compact -> width:1% (hint agar sekecil-kecilnya)
                                if (typeof meta.width === 'number') {
                                    style.width = `${meta.width}px`
                                } else if (meta.contentWidth || isIconCol) {
                                    style.width = '1%'
                                }

                                return <col key={col.id} style={style} />
                            })}
                        </colgroup>
                        <TableHeader>
                            {table.getHeaderGroups().map((hg) => (
                                <TableRow key={hg.id}>
                                    {hg.headers.map((header) => {
                                        const isCheckbox = header.column.id === 'select'
                                        const isAction = header.column.id === 'actions'
                                        const isStatus = header.column.id === 'is_active' || header.column.id === 'scan_status' || header.column.id === 'status'
                                        const isCount = header.column.id.includes('_count') || header.column.id.includes('count')
                                        const isIconCol = isCheckbox || isAction || isStatus || isCount
                                        const sorted = header.column.getIsSorted() // 'asc' | 'desc' | false

                                        return (
                                            <TableHead
                                                key={header.id}
                                                className={`${isIconCol ? 'px-2 py-2' : 'px-3 py-2'} align-top`}
                                                aria-sort={(() => {
                                                    if (sorted === 'asc') return 'ascending'
                                                    if (sorted === 'desc') return 'descending'
                                                    return 'none'
                                                })()}
                                            >
                                                {header.isPlaceholder ? null : (
                                                    <div className={`flex items-center ${isIconCol ? 'justify-center' : 'space-x-2'}`}>
                                                        <div className={`${isIconCol ? '' : 'flex-1 whitespace-normal break-words'}`}>
                                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                                        </div>
                                                        {header.column.getCanSort() && !isIconCol && (
                                                            <button
                                                                className="flex items-center space-x-1 hover:bg-muted/50 rounded p-1 transition-colors flex-shrink-0"
                                                                onClick={() => header.column.toggleSorting(header.column.getIsSorted() === 'asc')}
                                                                aria-label="Toggle sort"
                                                            >
                                                                {(() => {
                                                                    if (sorted === 'asc') {
                                                                        return <ChevronUp className="h-4 w-4 text-primary" />
                                                                    }
                                                                    if (sorted === 'desc') {
                                                                        return <ChevronDown className="h-4 w-4 text-primary" />
                                                                    }
                                                                    return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                                                                })()}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>

                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={tableColumns.length} className="h-24 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                                            <span>Loading...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                        {row.getVisibleCells().map((cell) => {
                                            const isCheckbox = cell.column.id === 'select'
                                            const isAction = cell.column.id === 'actions'
                                            const isStatus = cell.column.id === 'is_active' || cell.column.id === 'scan_status' || cell.column.id === 'status'
                                            const isCount = cell.column.id.includes('_count') || cell.column.id.includes('count')
                                            const isIconCol = isCheckbox || isAction || isStatus || isCount

                                            return (
                                                <TableCell
                                                    key={cell.id}
                                                    className={`${isIconCol ? 'px-2 py-2' : 'px-3 py-2'} align-top`}
                                                >
                                                    <div
                                                        className={(() => {
                                                            if (isIconCol) {
                                                                return 'flex justify-center whitespace-nowrap'
                                                            }
                                                            return 'min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]'
                                                        })()}
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </div>
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={tableColumns.length} className="h-24 text-center">
                                        {emptyMessage}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            {showPagination && (
                <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="flex items-center space-x-4">
                        <div className="flex-1 text-sm text-muted-foreground">
                            {(() => {
                                if (isClient) {
                                    return <>Showing {clientFrom} to {clientTo} of {clientTotal} entries</>
                                }
                                if (serverPagination) {
                                    return <>Showing {serverPagination.from} to {serverPagination.to} of {serverPagination.total} results</>
                                }
                                return null
                            })()}
                        </div>

                        {/* Page Size */}
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-muted-foreground">Show</span>
                            <Select
                                value={String(isClient ? clientPageSize : serverPagination?.per_page || pageSize)}
                                onValueChange={(val) => {
                                    const per = parseInt(val, 10)
                                    if (isClient) {
                                        setClientPageSize(per)
                                    } else {
                                        handlePaginationChange(1, per)
                                    }
                                }}
                            >
                                <SelectTrigger size="sm" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(pageSizeOptions || [10, 25, 50, 100]).map((n) => (
                                        <SelectItem key={n} value={String(n)}>
                                            {n}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground">entries</span>
                        </div>
                    </div>

                    <div className="space-x-2">
                        {(() => {
                            if (isClient) {
                                return (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => table.previousPage()}
                                            disabled={!table.getCanPreviousPage()}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => table.nextPage()}
                                            disabled={!table.getCanNextPage()}
                                        >
                                            Next
                                        </Button>
                                    </>
                                )
                            }
                            if (serverPagination) {
                                return (
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handlePaginationChange(
                                                    Math.max(1, (serverPagination.current_page || 1) - 1),
                                                    serverPagination.per_page,
                                                )
                                            }
                                            disabled={(serverPagination.current_page || 1) <= 1 || isLoading}
                                        >
                                            Previous
                                        </Button>
                                        <div className="text-sm">
                                            Page {serverPagination.current_page} of {serverPagination.last_page}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handlePaginationChange(
                                                    Math.min(serverPagination.last_page, (serverPagination.current_page || 1) + 1),
                                                    serverPagination.per_page,
                                                )
                                            }
                                            disabled={(serverPagination.current_page || 1) >= serverPagination.last_page || isLoading}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                )
                            }
                            return null
                        })()}
                    </div>
                </div>
            )}
        </div>
    )
}

export const DataTable = forwardRef(DataTableInner) as <TData, TValue>(
    p: DataTableProps<TData, TValue> & { ref?: Ref<DataTableHandle> },
) => React.ReactElement

export default DataTable
