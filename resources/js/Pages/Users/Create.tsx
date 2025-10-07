"use client"
import { Head, Link, useForm } from "@inertiajs/react"
import AppLayout from "@/Layouts/AppLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, UserPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEffect } from "react"

interface Props {
    errors?: Record<string, string>
}

export default function UsersCreate({ errors }: Props) {
    const { toast } = useToast()
    const { data, setData, post, processing, errors: formErrors } = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        role: "CLIENT",
    })

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            Object.values(errors).forEach((error) => {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error,
                })
            })
        }
    }, [errors])

    useEffect(() => {
        if (formErrors && Object.keys(formErrors).length > 0) {
            Object.values(formErrors).forEach((error) => {
                toast({
                    variant: "destructive",
                    title: "Validation Error",
                    description: error,
                })
            })
        }
    }, [formErrors])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        post("/users", {
            onSuccess: () => {
                toast({
                    title: "Success",
                    description: "User created successfully.",
                    variant: "success",
                })
            },
        })
    }

    return (
        <AppLayout>
            <Head title="Create User" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/users">
                            <Button variant="ghost" size="sm">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Users
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Create New User</h1>
                            <p className="text-muted-foreground">Add a new user to the system</p>
                        </div>
                    </div>
                </div>

                {/* Create User Form */}
                <Card className="max-w-4xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            User Information
                        </CardTitle>
                        <CardDescription>
                            Fill in the details below to create a new user account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData("name", e.target.value)}
                                        placeholder="Enter full name"
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData("email", e.target.value)}
                                        placeholder="Enter email address"
                                        required
                                    />
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password *</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData("password", e.target.value)}
                                        placeholder="Enter password"
                                        required
                                        minLength={8}
                                    />
                                </div>

                                {/* Password Confirmation */}
                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation">Confirm Password *</Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData("password_confirmation", e.target.value)}
                                        placeholder="Confirm password"
                                        required
                                        minLength={8}
                                    />
                                </div>

                                {/* Role */}
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="role">Role *</Label>
                                    <Select value={data.role} onValueChange={(value) => setData("role", value)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select user role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CLIENT">Client</SelectItem>
                                            <SelectItem value="ADMIN">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-sm text-muted-foreground">
                                        Clients can create and manage their own documents. Admins have full system access.
                                    </p>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-4 pt-6 border-t">
                                <Link href="/users">
                                    <Button type="button" variant="outline">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    {processing ? "Creating..." : "Create User"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    )
}
