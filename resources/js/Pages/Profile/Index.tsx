"use client"
import { Head, useForm, usePage } from "@inertiajs/react"
import AppLayout from "@/Layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Key, Activity, Calendar, Shield, Eye, EyeOff } from "lucide-react"
import { useState, useEffect } from "react"
import { route } from "ziggy-js"
import { useToast } from "@/hooks/use-toast"

interface User {
    id: number
    name: string
    email: string
    role: "ADMIN" | "CLIENT"
    created_at: string
    updated_at: string
}

interface ProfileIndexProps {
    user: User
}

export default function ProfileIndex({ user }: ProfileIndexProps) {
    const [activeTab, setActiveTab] = useState("profile")
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const { toast } = useToast()
    const { flash } = usePage().props as any

    // Profile update form
    const { data: profileData, setData: setProfileData, put: updateProfile, processing: profileProcessing, errors: profileErrors } = useForm({
        name: user.name,
        email: user.email,
    })

    // Password update form
    const { data: passwordData, setData: setPasswordData, put: updatePassword, processing: passwordProcessing, errors: passwordErrors, reset: resetPassword } = useForm({
        current_password: "",
        password: "",
        password_confirmation: "",
    })

    // Handle success messages
    useEffect(() => {
        if (flash.success) {
            toast({
                title: "Success",
                description: flash.success,
                variant: "success",
            })
        }
        if (flash.error) {
            toast({
                title: "Error",
                description: flash.error,
                variant: "destructive",
            })
        }
    }, [flash.success, flash.error, toast])

    const handleProfileUpdate = (e: React.FormEvent) => {
        e.preventDefault()
        updateProfile(route("profile.update"))
    }

    const handlePasswordUpdate = (e: React.FormEvent) => {
        e.preventDefault()
        updatePassword(route("profile.password"), {
            onSuccess: () => {
                resetPassword()
                toast({
                    title: "Success",
                    description: "Password updated successfully.",
                    variant: "success",
                })
            },
            onError: () => {
                toast({
                    title: "Error",
                    description: "Failed to update password. Please check your current password.",
                    variant: "destructive",
                })
            }
        })
    }

    return (
        <AppLayout>
            <Head title="Profile" />

            <div className="space-y-6">
                {/* Breadcrumb */}
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <a href="/dashboard">Dashboard</a>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Profile</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
                        <p className="text-muted-foreground">
                            Manage your account settings and preferences
                        </p>
                    </div>
                </div>

                <Separator />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="profile" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Profile
                        </TabsTrigger>
                        <TabsTrigger value="password" className="flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            Password
                        </TabsTrigger>
                        <TabsTrigger value="activities" className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Activities
                        </TabsTrigger>
                    </TabsList>

                    {/* Profile Tab */}
                    <TabsContent value="profile" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Profile Information
                                </CardTitle>
                                <CardDescription>
                                    Update your account's profile information and email address.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleProfileUpdate} className="space-y-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Name</Label>
                                            <Input
                                                id="name"
                                                type="text"
                                                value={profileData.name}
                                                onChange={(e) => setProfileData("name", e.target.value)}
                                                className={profileErrors.name ? "border-red-500" : ""}
                                            />
                                            {profileErrors.name && (
                                                <p className="text-sm text-red-500">{profileErrors.name}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={profileData.email}
                                                onChange={(e) => setProfileData("email", e.target.value)}
                                                className={profileErrors.email ? "border-red-500" : ""}
                                            />
                                            {profileErrors.email && (
                                                <p className="text-sm text-red-500">{profileErrors.email}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Button type="submit" disabled={profileProcessing}>
                                            {profileProcessing ? "Saving..." : "Save Changes"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Account Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    Account Information
                                </CardTitle>
                                <CardDescription>
                                    Your account details and role information.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Role</Label>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                                                {user.role}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Member Since</Label>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Password Tab */}
                    <TabsContent value="password" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Key className="h-5 w-5" />
                                    Update Password
                                </CardTitle>
                                <CardDescription>
                                    Ensure your account is using a long, random password to stay secure.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="current_password">Current Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="current_password"
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={passwordData.current_password}
                                                onChange={(e) => setPasswordData("current_password", e.target.value)}
                                                className={passwordErrors.current_password ? "border-red-500 pr-10" : "pr-10"}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            >
                                                {showCurrentPassword ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                        {passwordErrors.current_password && (
                                            <p className="text-sm text-red-500">{passwordErrors.current_password}</p>
                                        )}
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="password">New Password</Label>
                                            <div className="relative">
                                                <Input
                                                    id="password"
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={passwordData.password}
                                                    onChange={(e) => setPasswordData("password", e.target.value)}
                                                    className={passwordErrors.password ? "border-red-500 pr-10" : "pr-10"}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                >
                                                    {showNewPassword ? (
                                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </Button>
                                            </div>
                                            {passwordErrors.password && (
                                                <p className="text-sm text-red-500">{passwordErrors.password}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="password_confirmation">Confirm Password</Label>
                                            <div className="relative">
                                                <Input
                                                    id="password_confirmation"
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={passwordData.password_confirmation}
                                                    onChange={(e) => setPasswordData("password_confirmation", e.target.value)}
                                                    className={passwordErrors.password_confirmation ? "border-red-500 pr-10" : "pr-10"}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </Button>
                                            </div>
                                            {passwordErrors.password_confirmation && (
                                                <p className="text-sm text-red-500">{passwordErrors.password_confirmation}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Button type="submit" disabled={passwordProcessing}>
                                            {passwordProcessing ? "Updating..." : "Update Password"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Activities Tab */}
                    <TabsContent value="activities" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5" />
                                    Recent Activities
                                </CardTitle>
                                <CardDescription>
                                    View your recent account activities and changes.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8">
                                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Activity Logs</h3>
                                    <p className="text-muted-foreground mb-4">
                                        View your detailed activity history
                                    </p>
                                    <Button asChild>
                                        <a href={route("profile.activities")}>
                                            View All Activities
                                        </a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    )
}
