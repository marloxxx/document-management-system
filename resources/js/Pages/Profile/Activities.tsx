"use client"
import { Head, Link } from "@inertiajs/react"
import { useRef } from "react"
import { ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { DataTable } from "@/components/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import AppLayout from "@/Layouts/AppLayout"
import { route } from "ziggy-js"

interface User {
    id: number
    name: string
    email: string
    role: "ADMIN" | "CLIENT"
    created_at: string
    updated_at: string
}

interface ActivityLog {
    id: number
    log_name: string
    description: string
    subject_type: string
    subject_id: number
    properties: any
    created_at: string
}

interface ProfileActivitiesProps {
    user: User
}

export default function ProfileActivities({ }: ProfileActivitiesProps) {
    const dataTableRef = useRef<any>(null)

    // Column definitions
    const columns: ColumnDef<ActivityLog>[] = [
        {
            accessorKey: "description",
            header: "Action",
            cell: ({ row }) => (
                <div className="font-medium">{row.getValue("description")}</div>
            ),
        },
        {
            accessorKey: "subject_name",
            header: "Subject",
            cell: ({ row }) => {
                const activity = row.original
                if (!activity.subject_type) return <span className="text-muted-foreground">-</span>

                return (
                    <div className="text-sm">
                        {activity.subject_type === 'App\\Models\\User' ? 'User Profile' :
                            activity.subject_type === 'App\\Models\\Document' ? 'Document' :
                                activity.subject_type === 'App\\Models\\Registration' ? 'Registration' :
                                    activity.subject_type}
                    </div>
                )
            },
            enableSorting: false,
        },
        {
            accessorKey: "ip_address",
            header: "IP Address",
            cell: ({ row }) => {
                const activity = row.original
                const ipAddress = activity.properties?.ip_address
                return (
                    <div className="text-sm font-mono text-muted-foreground">
                        {ipAddress || '-'}
                    </div>
                )
            },
            enableSorting: false,
        },
        {
            accessorKey: "created_at",
            header: "Date",
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {new Date(row.getValue("created_at")).toLocaleString()}
                </div>
            ),
        },
    ]

    // Filter configurations
    const filterConfigs = [
        {
            key: "log_name",
            label: "Log Type",
            type: "select" as const,
            placeholder: "Select log type",
            options: [
                { label: "All Types", value: "all" },
                { value: "default", label: "Default" },
                { value: "auth", label: "Authentication" },
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
            onClick: () => {
                const url = route("profile.activities") + "/export"
                window.open(url, '_blank')
            }
        }
    ]

    return (
        <AppLayout>
            <Head title="My Activities" />

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
                            <BreadcrumbLink asChild>
                                <Link href="/profile">Profile</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Activities</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">My Activities</h1>
                        <p className="text-muted-foreground">
                            View your account activity history and changes
                        </p>
                    </div>
                    <Link href="/profile">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Profile
                        </Button>
                    </Link>
                </div>

                <Separator />

                <DataTable
                    ref={dataTableRef}
                    columns={columns}
                    mode="yajra"
                    apiUrl={route("profile.activities")}
                    dtColumns={["id", "log_name", "description", "subject_type", "subject_id", "properties", "created_at"]}
                    searchPlaceholder="Search activities..."
                    filters={filterConfigs}
                    actions={actionConfigs}
                    showRowSelection={false}
                    showColumnVisibility={true}
                    showPagination={true}
                    emptyMessage="No activities found."
                    pageSize={10}
                />
            </div>
        </AppLayout>
    )
}
