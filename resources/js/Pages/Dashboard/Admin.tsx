import { Head, Link } from "@inertiajs/react"
import AppLayout from "@/Layouts/AppLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, FileText, Hash, TrendingUp, ArrowRight, CheckCircle, Clock, AlertCircle } from "lucide-react"

interface Stats {
  total_users: number
  total_clients: number
  total_registrations: number
  total_documents: number
  issued_registrations: number
  partial_registrations: number
  committed_registrations: number
}

interface Registration {
  id: number
  number: string
  state: string
  issued_at: string
  issued_to: {
    id: number
    name: string
  }
}

interface Document {
  id: number
  registration_number: string
  direction: string
  title: string | null
  status: string
  created_at: string
  owner: {
    id: number
    name: string
  }
  type: {
    id: number
    name: string
  } | null
  registration: {
    id: number
    number: string
  }
}

interface MonthlyStats {
  month: string
  registrations: number
  documents: number
}

interface TopClient {
  id: number
  name: string
  email: string
  documents_count: number
}

interface Props {
  stats: Stats
  latestRegistration: Registration | null
  recentRegistrations: Registration[]
  recentDocuments: Document[]
  monthlyStats: MonthlyStats[]
  topClients: TopClient[]
}

export default function AdminDashboard({
  stats,
  latestRegistration,
  recentRegistrations,
  recentDocuments,
  monthlyStats: _monthlyStats,
  topClients,
}: Props) {
  const statCards = [
    {
      title: "Total Users",
      value: stats.total_users,
      description: `${stats.total_clients} clients`,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Registrations",
      value: stats.total_registrations,
      description: "Total issued",
      icon: Hash,
      color: "text-green-600",
    },
    {
      title: "Documents",
      value: stats.total_documents,
      description: "Total submitted",
      icon: FileText,
      color: "text-purple-600",
    },
    {
      title: "Active",
      value: stats.issued_registrations + stats.partial_registrations,
      description: "Available registrations",
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ]

  const getStateBadge = (state: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      ISSUED: { variant: "default", icon: Clock },
      PARTIAL: { variant: "secondary", icon: AlertCircle },
      COMMITTED: { variant: "outline", icon: CheckCircle },
      VOID: { variant: "destructive", icon: AlertCircle },
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
      <Head title="Admin Dashboard" />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of system statistics and recent activities</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        {/* Latest Registration Number */}
        {latestRegistration && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle>Latest Registration Number</CardTitle>
              <CardDescription>Most recently issued registration number</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-mono font-bold">{latestRegistration.number}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Issued to: {latestRegistration.issued_to.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Date: {new Date(latestRegistration.issued_at).toLocaleDateString()}
                  </p>
                </div>
                {getStateBadge(latestRegistration.state)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/users">
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-6">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">User Management</h3>
                      <p className="text-sm text-muted-foreground">Manage users and roles</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/registrations">
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-6">
                    <Hash className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold">Issue Registration</h3>
                      <p className="text-sm text-muted-foreground">Create new registration numbers</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/documents">
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-6">
                    <FileText className="h-8 w-8 text-purple-600" />
                    <div>
                      <h3 className="font-semibold">View Documents</h3>
                      <p className="text-sm text-muted-foreground">Browse all documents</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Registration States */}
        <Card>
          <CardHeader>
            <CardTitle>Registration States</CardTitle>
            <CardDescription>Current distribution of registration states</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Issued</p>
                  <p className="text-2xl font-bold">{stats.issued_registrations}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Partial</p>
                  <p className="text-2xl font-bold">{stats.partial_registrations}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Committed</p>
                  <p className="text-2xl font-bold">{stats.committed_registrations}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Registrations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Registrations</CardTitle>
                <CardDescription>Latest registration numbers issued</CardDescription>
              </div>
              <Link href="/registrations">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentRegistrations.map((reg) => (
                  <div key={reg.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-mono font-semibold">{reg.number}</p>
                      <p className="text-sm text-muted-foreground">{reg.issued_to.name}</p>
                    </div>
                    {getStateBadge(reg.state)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Top Clients</CardTitle>
              <CardDescription>Clients by document count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topClients.map((client, index) => (
                  <div key={client.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{client.documents_count} docs</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Documents</CardTitle>
              <CardDescription>Latest submitted documents</CardDescription>
            </div>
            <Link href="/documents">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-semibold">{doc.registration_number}</p>
                      <Badge variant="outline">{doc.direction}</Badge>
                    </div>
                    <p className="text-sm">{doc.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.owner.name} • {doc.type?.name || "No type"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
