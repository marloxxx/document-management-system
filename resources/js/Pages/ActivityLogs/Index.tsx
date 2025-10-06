"use client"
import { Head, Link } from "@inertiajs/react"
import { useRef } from "react"
import { Download, Eye, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import AppLayout from "@/Layouts/AppLayout"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/DataTable"

interface ActivityLog {
    id: number
    log_name: string
    description: string
    subject_type: string
    subject_id: number
    causer_type: string
    causer_id: number
    properties: Record<string, any>
    created_at: string
    user_name: string
    user_email: string
    subject_name: string
    ip_address: string
    formatted_date: string
}

interface Props {
    activityLogs?: ActivityLog[]
    filters?: {
        log_name?: string
        causer_id?: string
        date_from?: string
        date_to?: string
    }
    errors?: Record<string, string>
}

export default function ActivityLogsIndex({ }: Props) {
    const dataTableRef = useRef<any>(null)

    const handleExport = () => {
        window.open('/activity-logs/export', '_blank')
    }

    const columns: ColumnDef<ActivityLog>[] = [
        {
            accessorKey: "formatted_date",
            header: "Date",
            cell: ({ row }) => {
                const date = new Date(row.getValue("formatted_date"))
                return (
                    <div className="text-sm">
                        {date.toLocaleDateString("id-ID", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        })}
                        <br />
                        <span className="text-muted-foreground">
                            {date.toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: "user_name",
            header: "User",
            cell: ({ row }) => {
                const userName = row.getValue("user_name") as string
                const userEmail = row.original.user_email
                return (
                    <div>
                        <div className="font-medium">{userName || 'N/A'}</div>
                        {userEmail && userEmail !== '-' && (
                            <div className="text-sm text-muted-foreground">{userEmail}</div>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: "description",
            header: "Action",
            cell: ({ row }) => {
                const description = row.getValue("description") as string
                return (
                    <div className="max-w-[200px]">
                        <Badge variant="outline" className="text-xs">
                            {description || 'N/A'}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "subject_name",
            header: "Subject",
            cell: ({ row }) => {
                const subjectName = row.getValue("subject_name") as string
                const subjectType = row.original.subject_type
                return (
                    <div>
                        <div className="font-medium">{subjectName || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                            {subjectType ? subjectType.split('\\').pop() : 'N/A'}
                        </div>
                    </div>
                )
            },
        },
        {
            accessorKey: "ip_address",
            header: "IP Address",
            cell: ({ row }) => {
                const ipAddress = row.getValue("ip_address") as string
                return (
                    <span className="font-mono text-sm">
                        {ipAddress !== '-' ? ipAddress : 'N/A'}
                    </span>
                )
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const activityId = row.original.id
                return (
                    <div className="flex items-center gap-2">
                        <Link href={`/activity-logs/${activityId}`}>
                            <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                )
            },
        },
    ]

    return (
        <AppLayout>
            <Head title="Activity Logs" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
                        <p className="text-muted-foreground">Monitor system activities and user actions</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (dataTableRef.current) {
                                    dataTableRef.current.reload()
                                }
                            }}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </div>


                {/* Activity Logs Table */}
                <div className="w-full">
                    <DataTable
                        ref={dataTableRef}
                        columns={columns}
                        mode="yajra"
                        apiUrl="/activity-logs"
                        dtColumns={["id", "log_name", "description", "subject_type", "subject_id", "causer_type", "causer_id", "properties", "created_at", "user_name", "user_email", "subject_name", "ip_address", "formatted_date"]}
                        searchPlaceholder="Search activities..."
                        emptyMessage="No activity logs found."
                        showColumnVisibility={true}
                        showPagination={true}
                        pageSize={15}
                    />
                </div>
            </div>
        </AppLayout>
    )
}
