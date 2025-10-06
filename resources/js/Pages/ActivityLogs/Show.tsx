"use client"
import { Head, Link } from "@inertiajs/react"
import { ArrowLeft, Calendar, User, Activity, Globe, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import AppLayout from "@/Layouts/AppLayout"

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
    causer?: {
        id: number
        name: string
        email: string
    }
    subject?: {
        id: number
        name?: string
        registration_number?: string
        number?: string
    }
}

interface Props {
    activity: ActivityLog
}

export default function ActivityLogShow({ activity }: Props) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return {
            date: date.toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }),
            time: date.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            }),
        }
    }

    const getSubjectDisplayName = () => {
        if (!activity.subject) return "N/A"

        if (activity.subject_type === "App\\Models\\User") {
            return activity.subject.name || "Unknown User"
        }

        if (activity.subject_type === "App\\Models\\Document") {
            return activity.subject.registration_number || "Unknown Document"
        }

        if (activity.subject_type === "App\\Models\\Registration") {
            return activity.subject.number || "Unknown Registration"
        }

        return `${activity.subject_type.split('\\').pop()} #${activity.subject_id}`
    }

    const getSubjectTypeDisplay = () => {
        return activity.subject_type.split('\\').pop() || "Unknown"
    }

    const { date, time } = formatDate(activity.created_at)

    return (
        <AppLayout>
            <Head title={`Activity Log #${activity.id}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/activity-logs">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Activity Logs
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Activity Log #{activity.id}
                            </h1>
                            <p className="text-muted-foreground">Detailed view of system activity</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Activity Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5" />
                                    Activity Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                                        <div className="mt-1">
                                            <Badge variant="outline" className="text-sm">
                                                {activity.description}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Log Name</label>
                                        <div className="mt-1">
                                            <Badge variant="secondary" className="text-sm">
                                                {activity.log_name}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Subject</label>
                                        <div className="mt-1 font-medium">{getSubjectDisplayName()}</div>
                                        <div className="text-sm text-muted-foreground">
                                            Type: {getSubjectTypeDisplay()}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Subject ID</label>
                                        <div className="mt-1 font-mono text-sm">{activity.subject_id}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Properties */}
                        {activity.properties && Object.keys(activity.properties).length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Properties
                                    </CardTitle>
                                    <CardDescription>
                                        Additional data associated with this activity
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="bg-muted/50 rounded-lg p-4">
                                        <pre className="text-sm overflow-x-auto">
                                            {JSON.stringify(activity.properties, null, 2)}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* User Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    User Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {activity.causer ? (
                                    <>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Name</label>
                                            <div className="mt-1 font-medium">{activity.causer.name}</div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Email</label>
                                            <div className="mt-1 text-sm">{activity.causer.email}</div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">User ID</label>
                                            <div className="mt-1 font-mono text-sm">{activity.causer.id}</div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="text-muted-foreground">System Action</div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            This activity was performed by the system
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Timestamp */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Timestamp
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Date</label>
                                    <div className="mt-1 font-medium">{date}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Time</label>
                                    <div className="mt-1 font-mono text-sm">{time}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                                    <div className="mt-1 font-mono text-sm">
                                        {activity.properties?.ip_address || "N/A"}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Technical Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="h-5 w-5" />
                                    Technical Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Activity ID</label>
                                    <div className="mt-1 font-mono text-sm">{activity.id}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Causer Type</label>
                                    <div className="mt-1 text-sm">{activity.causer_type}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Subject Type</label>
                                    <div className="mt-1 text-sm">{activity.subject_type}</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    )
}
