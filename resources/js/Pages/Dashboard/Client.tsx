"use client"
import { Head, Link, router } from "@inertiajs/react"
import AppLayout from "@/Layouts/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Hash, Plus, ArrowRight, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface Stats {
  my_registrations: number
  my_documents: number
  issued_registrations: number
  partial_registrations: number
  committed_registrations: number
}

interface Registration {
  id: number
  number: string
  state: string
  issued_at: string
}

interface Document {
  id: number
  registration_number: string
  direction: string
  title: string | null
  status: string
  created_at: string
  type: {
    id: number
    name: string
  } | null
  registration: {
    id: number
    number: string
  }
}

interface Props {
  stats: Stats
  latestRegistration: Registration | null
  recentRegistrations: Registration[]
  recentDocuments: Document[]
  availableRegistrations: Registration[]
}

export default function ClientDashboard({
  stats,
  latestRegistration,
  recentRegistrations,
  recentDocuments,
  availableRegistrations,
}: Props) {
  const [issuingNumber, setIssuingNumber] = useState(false)
  const { toast } = useToast()

  const handleIssueNumber = async () => {
    setIssuingNumber(true)
    try {
      router.post(
        "/registrations/issue",
        {},
        {
          onSuccess: () => {
            toast({
              title: "Success",
              description: "New registration number issued successfully",
            })
            // Refresh the dashboard to show updated data
            router.reload()
          },
          onError: () => {
            toast({
              title: "Error",
              description: "Failed to issue registration number",
              variant: "destructive",
            })
          },
          onFinish: () => setIssuingNumber(false),
        },
      )
    } catch (error) {
      setIssuingNumber(false)
      toast({
        title: "Error",
        description: "Failed to issue registration number",
        variant: "destructive",
      })
    }
  }

  const statCards = [
    {
      title: "My Registrations",
      value: stats.my_registrations,
      description: "Total issued to me",
      icon: Hash,
      color: "text-blue-600",
    },
    {
      title: "My Documents",
      value: stats.my_documents,
      description: "Total submitted",
      icon: FileText,
      color: "text-purple-600",
    },
    {
      title: "Available",
      value: stats.issued_registrations + stats.partial_registrations,
      description: "Can be used",
      icon: CheckCircle,
      color: "text-green-600",
    },
  ]

  const getStateBadge = (state: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      ISSUED: { variant: "default", icon: Clock },
      PARTIAL: { variant: "secondary", icon: AlertCircle },
      COMMITTED: { variant: "outline", icon: CheckCircle },
    }
    const config = variants[state] || variants.ISSUED
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {state}
      </Badge>
    )
  }

  return (
    <AppLayout>
      <Head title="Dashboard" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Manage your registrations and documents</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleIssueNumber} disabled={issuingNumber}>
              <Plus className="mr-2 h-4 w-4" />
              {issuingNumber ? "Issuing..." : "Issue Number"}
            </Button>
            <Link href="/documents/create">
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                New Document
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Latest Registration */}
        {latestRegistration && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle>Latest Registration Number</CardTitle>
              <CardDescription>Your most recent registration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-mono font-bold">{latestRegistration.number}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Issued: {new Date(latestRegistration.issued_at).toLocaleDateString()}
                  </p>
                </div>
                {getStateBadge(latestRegistration.state)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Registrations */}
        {availableRegistrations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Available Registration Numbers</CardTitle>
              <CardDescription>Numbers that can still be used for documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availableRegistrations.map((reg) => (
                  <div key={reg.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-mono font-semibold">{reg.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {reg.state === "ISSUED" ? "Available for any language direction" : "1 document already used"}
                      </p>
                    </div>
                    {getStateBadge(reg.state)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Registrations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Registrations</CardTitle>
                <CardDescription>Your latest registration numbers</CardDescription>
              </div>
              <Link href="/registrations">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRegistrations.map((reg) => (
                  <div key={reg.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-mono font-semibold">{reg.number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(reg.issued_at).toLocaleDateString()}</p>
                    </div>
                    {getStateBadge(reg.state)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Documents</CardTitle>
                <CardDescription>Your latest submissions</CardDescription>
              </div>
              <Link href="/documents">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-semibold">{doc.registration_number}</p>
                        <Badge variant="outline" className="text-xs">
                          {doc.direction}
                        </Badge>
                      </div>
                      <p className="text-sm">{doc.title || "Untitled"}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
