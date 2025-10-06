"use client"
import { Head, Link } from "@inertiajs/react"
import { useRef } from "react"
import { Plus, MoreHorizontal, Edit, Trash2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import AppLayout from "@/Layouts/AppLayout"
import { ColumnDef } from "@tanstack/react-table"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useConfirm } from "@/components/custom"
import { DataTable } from "@/components/DataTable"
import { useActionHandler } from "@/hooks/useActionHandler"
import { route } from "ziggy-js"

interface User {
    id: number
    name: string
    email: string
    role: "ADMIN" | "CLIENT"
    created_at: string
    updated_at: string
}

interface UsersIndexProps {
    users: User[]
}

export default function UsersIndex({ }: UsersIndexProps) {
    const confirm = useConfirm()
    const dataTableRef = useRef<any>(null)
    const { handleDelete, handleExport, handleBulkDelete } = useActionHandler()

    // Column definitions
    const columns: ColumnDef<User>[] = [
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => (
                <div className="font-medium">{row.getValue("name")}</div>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => (
                <div className="min-w-0">
                    {row.getValue("email")}
                </div>
            ),
        },
        {
            accessorKey: "role",
            header: "Role",
            cell: ({ row }) => {
                const role = row.getValue("role") as string
                return (
                    <Badge className={role === "ADMIN" ? "bg-brand-secondary" : "bg-muted-block"}>
                        {role}
                    </Badge>
                )
            },
            enableSorting: false,
        },
        {
            accessorKey: "created_at",
            header: "Created At",
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {new Date(row.getValue("created_at")).toLocaleDateString()}
                </div>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            enableSorting: false,
            cell: ({ row }) => {
                const user = row.original
                const userName = user.name

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
                                <Link href={route("users.edit", user.id)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: "Delete User",
                                        description: `Are you sure you want to delete user ${userName}? This action cannot be undone.`,
                                        confirmText: "Delete",
                                    })
                                    if (ok) {
                                        handleDelete(user.id, route("users.destroy", user.id), `User ${userName}`, {
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
            key: "role",
            label: "Role",
            type: "select" as const,
            placeholder: "Select role",
            options: [
                { label: "All Roles", value: "all" },
                { value: "ADMIN", label: "Admin" },
                { value: "CLIENT", label: "Client" }
            ]
        },
    ]

    // Action configurations
    const actionConfigs = [
        {
            label: "Export",
            icon: Download,
            variant: "outline" as const,
            size: "sm" as const,
            onClick: (selectedRows?: any[]) => {
                handleExport(selectedRows || [], "users")
            }
        },
        {
            label: "Bulk Delete",
            icon: Trash2,
            variant: "destructive" as const,
            size: "sm" as const,
            showWhenSelected: true,
            onClick: (selectedRows?: any[]) => {
                handleBulkDelete(selectedRows || [], "users")
            }
        }
    ]

    return (
        <AppLayout>
            <Head title="Users" />

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
                            <BreadcrumbPage>User Management</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                        <p className="text-muted-foreground">
                            Manage system users and their roles
                        </p>
                    </div>
                    <Link href={route("users.create")}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create User
                        </Button>
                    </Link>
                </div>

                <Separator />

                <DataTable
                    ref={dataTableRef}
                    columns={columns}
                    mode="yajra"
                    apiUrl={route("users.index")}
                    dtColumns={["id", "name", "email", "role", "created_at", "updated_at"]}
                    searchPlaceholder="Search users..."
                    filters={filterConfigs}
                    actions={actionConfigs}
                    showRowSelection={true}
                    showColumnVisibility={true}
                    showPagination={true}
                    emptyMessage="No users found."
                    pageSize={10}
                />
            </div>
        </AppLayout>
    )
}