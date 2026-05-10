'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Users,
  Building2,
  CreditCard,
  DollarSign,
  Search,
  Shield,
  ArrowLeft,
  Settings,
  Activity,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalOrganizations: number
  activeSubscriptions: number
  revenueEstimate: number
}

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  language: string
  lastLoginAt: string | null
  createdAt: string
  organizations: number
}

interface AdminOrg {
  id: string
  name: string
  plan: string
  subscriptionStatus: string
  language: string
  industry: string | null
  createdAt: string
  users: number
}

const planBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  free: 'secondary',
  pro: 'default',
  enterprise: 'outline',
}

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  trialing: 'secondary',
  past_due: 'destructive',
  cancelled: 'outline',
}

export function AdminPortal() {
  const { setIsAdminPortal, currentUser } = useAppStore()
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalOrganizations: 0, activeSubscriptions: 0, revenueEstimate: 0 })
  const [users, setUsers] = useState<AdminUser[]>([])
  const [orgs, setOrgs] = useState<AdminOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [orgSearch, setOrgSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/admin?userId=${currentUser?.id}`)
        const data = await res.json()
        if (!cancelled && data.success) {
          setStats(data.stats)
          setUsers(data.users)
          setOrgs(data.organizations)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to fetch admin data:', err)
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_user', userId, isActive: !currentStatus, adminUserId: currentUser?.id }),
      })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u))
    } catch (err) {
      console.error('Failed to toggle user status:', err)
    }
  }

  const updateOrgPlan = async (orgId: string, plan: string) => {
    try {
      await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_plan', orgId, plan, adminUserId: currentUser?.id }),
      })
      setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, plan } : o))
    } catch (err) {
      console.error('Failed to update org plan:', err)
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const filteredOrgs = orgs.filter(o =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase())
  )

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-emerald-600' },
    { title: 'Total Organizations', value: stats.totalOrganizations, icon: Building2, color: 'text-orange-600' },
    { title: 'Active Subscriptions', value: stats.activeSubscriptions, icon: CreditCard, color: 'text-primary' },
    { title: 'Revenue Estimate', value: `$${stats.revenueEstimate.toLocaleString()}`, icon: DollarSign, color: 'text-amber-600' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdminPortal(false)}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to App</span>
            </Button>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                HP
              </div>
              <div>
                <h1 className="text-sm font-semibold">Admin Portal</h1>
                <p className="text-[10px] text-muted-foreground">Hisab Pro Management</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-xs">
            <Shield className="h-3 w-3" />
            Super Admin
          </Badge>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto gap-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <Activity className="h-3.5 w-3.5 hidden sm:block" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 hidden sm:block" />
              Users
            </TabsTrigger>
            <TabsTrigger value="organizations" className="gap-1.5 text-xs sm:text-sm">
              <Building2 className="h-3.5 w-3.5 hidden sm:block" />
              Organizations
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-1.5 text-xs sm:text-sm">
              <CreditCard className="h-3.5 w-3.5 hidden sm:block" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5 text-xs sm:text-sm">
              <Settings className="h-3.5 w-3.5 hidden sm:block" />
              System
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {statCards.map((stat) => {
                const Icon = stat.icon
                return (
                  <Card key={stat.title}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">{stat.title}</p>
                          <p className="text-xl sm:text-2xl font-bold mt-1">{stat.value}</p>
                        </div>
                        <div className={cn('p-2 rounded-lg bg-muted', stat.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Recent Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filteredUsers.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Recent Organizations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filteredOrgs.slice(0, 5).map((org) => (
                    <div key={org.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.users} users</p>
                        </div>
                      </div>
                      <Badge variant={planBadgeVariant[org.plan] || 'secondary'} className="text-[10px] shrink-0">
                        {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-sm font-semibold">All Users ({users.length})</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Role</TableHead>
                        <TableHead className="text-xs">Orgs</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium text-sm">{user.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{user.organizations}</TableCell>
                            <TableCell>
                              <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                onClick={() => toggleUserStatus(user.id, user.isActive)}
                              >
                                {user.isActive ? (
                                  <><ToggleRight className="h-3.5 w-3.5" /> Disable</>
                                ) : (
                                  <><ToggleLeft className="h-3.5 w-3.5" /> Enable</>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-sm font-semibold">All Organizations ({orgs.length})</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search organizations..."
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Plan</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Industry</TableHead>
                        <TableHead className="text-xs">Users</TableHead>
                        <TableHead className="text-xs">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrgs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                            No organizations found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrgs.map((org) => (
                          <TableRow key={org.id}>
                            <TableCell className="font-medium text-sm">{org.name}</TableCell>
                            <TableCell>
                              <Badge variant={planBadgeVariant[org.plan] || 'secondary'} className="text-[10px]">
                                {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusBadgeVariant[org.subscriptionStatus] || 'outline'} className="text-[10px]">
                                {org.subscriptionStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {org.industry || '—'}
                            </TableCell>
                            <TableCell className="text-sm">{org.users}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(org.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Manage Subscriptions</CardTitle>
                <p className="text-xs text-muted-foreground">Upgrade or downgrade organization plans</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Organization</TableHead>
                        <TableHead className="text-xs">Current Plan</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Change Plan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrgs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                            No organizations found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrgs.map((org) => (
                          <TableRow key={org.id}>
                            <TableCell className="font-medium text-sm">{org.name}</TableCell>
                            <TableCell>
                              <Badge variant={planBadgeVariant[org.plan] || 'secondary'} className="text-[10px]">
                                {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusBadgeVariant[org.subscriptionStatus] || 'outline'} className="text-[10px]">
                                {org.subscriptionStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={org.plan}
                                onValueChange={(value) => updateOrgPlan(org.id, value)}
                              >
                                <SelectTrigger className="h-8 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="pro">Pro</SelectItem>
                                  <SelectItem value="enterprise">Enterprise</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">System Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Application</span>
                    <span className="text-sm font-medium">Hisab Pro</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Version</span>
                    <span className="text-sm font-medium">1.0.0</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Environment</span>
                    <Badge variant="secondary" className="text-[10px]">Production</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Database</span>
                    <span className="text-sm font-medium">SQLite</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">Region</span>
                    <span className="text-sm font-medium">Nepal (Asia/Kathmandu)</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Currency</span>
                    <span className="text-sm font-medium">NPR (रू)</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">VAT Rate</span>
                    <span className="text-sm font-medium">13%</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">IRD Compliance</span>
                    <Badge variant="default" className="text-[10px]">Ready</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">NFRS Compliant</span>
                    <Badge variant="default" className="text-[10px]">Yes</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">TDS Support</span>
                    <Badge variant="default" className="text-[10px]">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">SSF Support</span>
                    <Badge variant="default" className="text-[10px]">Enabled</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
