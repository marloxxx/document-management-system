"use client"

import type * as React from "react"
import { Head, useForm, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/ui/input-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Mail, Lock, Sun, Moon, FileText } from "lucide-react"
import { useState } from "react"
import { useTheme } from "next-themes"

export default function Login({ status, canResetPassword }: { status?: string; canResetPassword?: boolean }) {
  const [showPassword, setShowPassword] = useState(false)

  const { data, setData, post, processing, errors, reset } = useForm({
    email: "",
    password: "",
    remember: false,
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    post("/login", {
      onFinish: () => reset("password"),
    })
  }

  const { theme, setTheme } = useTheme()

  return (
    <>
      <Head title="Login" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <FileText className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Document Management System</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-xs"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark Mode
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card className="border-border/50 shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Sign In</CardTitle>
              <CardDescription className="text-center">
                Enter your email and password to access your account
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {status && (
                <Alert>
                  <AlertDescription>{status}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <Mail className="h-4 w-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="email"
                      type="email"
                      value={data.email}
                      onChange={(e) => setData("email", e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </InputGroup>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <InputGroup>
                    <InputGroupAddon align="inline-start">
                      <Lock className="h-4 w-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={data.password}
                      onChange={(e) => setData("password", e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={data.remember}
                      onChange={(e) => setData("remember", e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                    <Label htmlFor="remember" className="text-sm">
                      Remember me
                    </Label>
                  </div>

                  {canResetPassword && (
                    <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/80">
                      Forgot password?
                    </Link>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                  {processing ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">Contact administrator for account access.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
