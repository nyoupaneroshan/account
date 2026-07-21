'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR } from '@/lib/nepal-accounting'
import { t } from '@/lib/i18n'
import { PLANS, getPlan } from '@/lib/plans'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Database,
  Globe,
  Clock,
  Server,
  UserPlus,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Mail,
  LayoutGrid,
} from 'lucide-react'
import { authFetch } from '@/lib/session'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================
interface AdminStats {
  totalUsers: number
  activeUsers: number
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
  address?: string | null
  city?: string | null
  province?: string | null
  phone?: string | null
  email?: string | null
  vatEnabled?: boolean
  mode?: string
}

interface OrgMember {
  id: string
  userId: string
  email: string
  name: string
  nameNepali: string | null
  phone: string | null
  role: string
  isActive: boolean
  lastLoginAt: string | null
  joinedAt: string
}

// ============================================================
// Constants
// ============================================================
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

const VALID_ROLES = ['admin', 'accountant', 'staff', 'viewer']

// ============================================================
// Main Component
// ============================================================
export function AdminPortal() {
  const { setIsAdminPortal, currentUser, language, refreshSession } = useAppStore()
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalOrganizations: 0,
    activeSubscriptions: 0,
    revenueEstimate: 0,
  })
  const [users, setUsers] = useState<AdminUser[]>([])
  const [orgs, setOrgs] = useState<AdminOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [orgSearch, setOrgSearch] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  // RBAC state
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // Add user dialog
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [addUserEmail, setAddUserEmail] = useState('')
  const [addUserRole, setAddUserRole] = useState('staff')
  const [addingUser, setAddingUser] = useState(false)

  // Edit role dialog
  const [editRoleOpen, setEditRoleOpen] = useState(false)
  const [editMember, setEditMember] = useState<OrgMember | null>(null)
  const [editRole, setEditRole] = useState('')
  const [updatingRole, setUpdatingRole] = useState(false)

  // Remove user dialog
  const [removeUserOpen, setRemoveUserOpen] = useState(false)
  const [removeMember, setRemoveMember] = useState<OrgMember | null>(null)
  const [removingUser, setRemovingUser] = useState(false)

  // Edit org dialog
  const [editOrgOpen, setEditOrgOpen] = useState(false)
  const [editOrg, setEditOrg] = useState<AdminOrg | null>(null)
  const [editOrgForm, setEditOrgForm] = useState({
    name: '',
    plan: 'free',
    industry: '',
    language: 'en',
    address: '',
    city: '',
    province: '',
    phone: '',
    email: '',
    vatEnabled: false,
    mode: 'simple',
  })
  const [updatingOrg, setUpdatingOrg] = useState(false)

  // All memberships view
  const [allMemberships, setAllMemberships] = useState<Array<{
    id: string
    userId: string
    userName: string
    userEmail: string
    orgId: string
    orgName: string
    role: string
    joinedAt: string
  }>>([])
  const [membershipsLoading, setMembershipsLoading] = useState(false)

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    try {
      const res = await authFetch(`/api/admin?userId=${currentUser?.id}`)
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setUsers(data.users || [])
        setOrgs(data.organizations || [])
        // Auto-select first org if none selected
        if (!selectedOrg && data.organizations?.length > 0) {
          setSelectedOrg(data.organizations[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [currentUser?.id, selectedOrg])

  // Load org members when selected org changes
  const loadOrgMembers = useCallback(async () => {
    if (!selectedOrg) return
    setMembersLoading(true)
    try {
      const res = await authFetch(`/api/admin/rbac?orgId=${selectedOrg}&userId=${currentUser?.id}`)
      const data = await res.json()
      if (data.success) {
        setOrgMembers(data.members || [])
      } else {
        setOrgMembers([])
      }
    } catch (err) {
      console.error('Failed to fetch org members:', err)
      setOrgMembers([])
    } finally {
      setMembersLoading(false)
    }
  }, [selectedOrg, currentUser?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (selectedOrg) {
      loadOrgMembers()
    }
  }, [selectedOrg, loadOrgMembers])

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (userId === currentUser?.id) {
      toast.error('Cannot deactivate your own account')
      return
    }

    try {
      const res = await authFetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_user', userId, isActive: !currentStatus, adminUserId: currentUser?.id }),
      })

      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u))
        toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`)
      } else {
        toast.error('Failed to update user status')
      }
    } catch (err) {
      console.error('Failed to toggle user status:', err)
      toast.error('Failed to update user status')
    }
  }

  const updateOrgPlan = async (orgId: string, plan: string) => {
    try {
      const res = await authFetch('/api/admin/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId, plan, userId: currentUser?.id }),
      })

      if (res.ok) {
        setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, plan } : o))
        toast.success(`Plan updated to ${plan}`)
      } else {
        toast.error('Failed to update plan')
      }
    } catch (err) {
      console.error('Failed to update org plan:', err)
      toast.error('Failed to update plan')
    }
  }

  // RBAC: Add user to org
  const handleAddUser = async () => {
    if (!addUserEmail.trim() || !selectedOrg) return
    setAddingUser(true)
    try {
      const res = await authFetch('/api/admin/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser?.id,
          email: addUserEmail.trim(),
          organizationId: selectedOrg,
          role: addUserRole,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message)
        setAddUserOpen(false)
        setAddUserEmail('')
        setAddUserRole('staff')
        loadOrgMembers()
      } else {
        toast.error(data.error || 'Failed to add user')
      }
    } catch {
      toast.error('Failed to add user to organization')
    } finally {
      setAddingUser(false)
    }
  }

  // RBAC: Update user role
  const handleUpdateRole = async () => {
    if (!editMember || !selectedOrg || !editRole) return
    setUpdatingRole(true)
    try {
      const res = await authFetch('/api/admin/rbac', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser?.id,
          userId: editMember.userId,
          organizationId: selectedOrg,
          role: editRole,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message)
        setEditRoleOpen(false)
        setEditMember(null)
        loadOrgMembers()
      } else {
        toast.error(data.error || 'Failed to update role')
      }
    } catch {
      toast.error('Failed to update user role')
    } finally {
      setUpdatingRole(false)
    }
  }

  // RBAC: Remove user from org
  const handleRemoveUser = async () => {
    if (!removeMember || !selectedOrg) return
    setRemovingUser(true)
    try {
      const res = await authFetch('/api/admin/rbac', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser?.id,
          userId: removeMember.userId,
          organizationId: selectedOrg,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message)
        setRemoveUserOpen(false)
        setRemoveMember(null)
        loadOrgMembers()
      } else {
        toast.error(data.error || 'Failed to remove user')
      }
    } catch {
      toast.error('Failed to remove user from organization')
    } finally {
      setRemovingUser(false)
    }
  }

  // Organization: Open edit dialog
  const openEditOrgDialog = (org: AdminOrg) => {
    setEditOrg(org)
    setEditOrgForm({
      name: org.name || '',
      plan: org.plan || 'free',
      industry: org.industry || '',
      language: org.language || 'en',
      address: org.address || '',
      city: org.city || '',
      province: org.province || '',
      phone: org.phone || '',
      email: org.email || '',
      vatEnabled: org.vatEnabled || false,
      mode: org.mode || 'simple',
    })
    setEditOrgOpen(true)
  }

  // Organization: Update org
  const handleUpdateOrg = async () => {
    if (!editOrg) return
    setUpdatingOrg(true)
    try {
      const res = await authFetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_org',
          adminUserId: currentUser?.id,
          orgId: editOrg.id,
          name: editOrgForm.name,
          plan: editOrgForm.plan,
          industry: editOrgForm.industry || null,
          language: editOrgForm.language,
          address: editOrgForm.address || null,
          city: editOrgForm.city || null,
          province: editOrgForm.province || null,
          phone: editOrgForm.phone || null,
          email: editOrgForm.email || null,
          vatEnabled: editOrgForm.vatEnabled,
          mode: editOrgForm.mode,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('Organization updated successfully')
        setEditOrgOpen(false)
        setEditOrg(null)
        loadData(true)
      } else {
        toast.error(data.error || 'Failed to update organization')
      }
    } catch {
      toast.error('Failed to update organization')
    } finally {
      setUpdatingOrg(false)
    }
  }

  // Load all memberships across all orgs
  const loadAllMemberships = useCallback(async () => {
    setMembershipsLoading(true)
    try {
      const res = await authFetch(`/api/admin/rbac?orgId=all&userId=${currentUser?.id}`)
      const data = await res.json()
      if (data.success) {
        setAllMemberships(data.members || [])
      } else {
        setAllMemberships([])
      }
    } catch {
      setAllMemberships([])
    } finally {
      setMembershipsLoading(false)
    }
  }, [currentUser?.id])

  // Filtered lists
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    const matchesFilter = userFilter === 'all' ||
      (userFilter === 'active' && u.isActive) ||
      (userFilter === 'inactive' && !u.isActive)
    return matchesSearch && matchesFilter
  })

  const filteredOrgs = orgs.filter(o =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase())
  )

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { title: 'Organizations', value: stats.totalOrganizations, icon: Building2, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950/30' },
    { title: 'Active Subscriptions', value: stats.activeSubscriptions, icon: CreditCard, color: 'text-primary', bgColor: 'bg-primary/10' },
    { title: 'Revenue (Est.)', value: formatNPR(stats.revenueEstimate), icon: DollarSign, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                setIsAdminPortal(false)
                // Refresh session to pick up any plan/role changes made in admin
                try { await refreshSession() } catch { /* ignore */ }
              }}
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
                <h1 className="text-sm font-semibold">{t('admin_portal', language as 'en' | 'ne' | 'hi')}</h1>
                <p className="text-[10px] text-muted-foreground">Hisab Pro Management</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Badge variant="outline" className="gap-1 text-xs">
              <Shield className="h-3 w-3" />
              {t('super_admin', language as 'en' | 'ne' | 'hi')}
            </Badge>
          </div>
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
            <TabsTrigger value="rbac" className="gap-1.5 text-xs sm:text-sm">
              <Shield className="h-3.5 w-3.5 hidden sm:block" />
              RBAC
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
                        <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                          <Icon className={cn('h-5 w-5', stat.color)} />
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
                <CardContent className="space-y-3 max-h-64 overflow-y-auto">
                  {users.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No users found
                    </div>
                  ) : (
                    users.slice(0, 8).map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                            user.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-muted text-muted-foreground'
                          )}>
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
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Recent Organizations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-64 overflow-y-auto">
                  {orgs.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No organizations found
                    </div>
                  ) : (
                    orgs.slice(0, 8).map((org) => (
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
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-sm font-semibold">
                    {t('manage_users', language as 'en' | 'ne' | 'hi')} ({users.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="h-9 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
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
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">{t('name', language as 'en' | 'ne' | 'hi')}</TableHead>
                        <TableHead className="text-xs">{t('email', language as 'en' | 'ne' | 'hi')}</TableHead>
                        <TableHead className="text-xs">Role</TableHead>
                        <TableHead className="text-xs">Orgs</TableHead>
                        <TableHead className="text-xs">{t('last_login', language as 'en' | 'ne' | 'hi')}</TableHead>
                        <TableHead className="text-xs">{t('status', language as 'en' | 'ne' | 'hi')}</TableHead>
                        <TableHead className="text-xs text-right">{t('actions', language as 'en' | 'ne' | 'hi')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium text-sm">{user.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{user.organizations}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {user.lastLoginAt
                                ? new Date(user.lastLoginAt).toLocaleDateString()
                                : 'Never'}
                            </TableCell>
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
                                disabled={user.id === currentUser?.id}
                              >
                                {user.isActive ? (
                                  <><ToggleRight className="h-3.5 w-3.5 text-green-600" /> Disable</>
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
                  <CardTitle className="text-sm font-semibold">
                    {t('all_organizations', language as 'en' | 'ne' | 'hi')} ({orgs.length})
                  </CardTitle>
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
                        <TableHead className="text-xs">{t('organization_name', language as 'en' | 'ne' | 'hi')}</TableHead>
                        <TableHead className="text-xs">{t('plan_type', language as 'en' | 'ne' | 'hi')}</TableHead>
                        <TableHead className="text-xs">{t('status', language as 'en' | 'ne' | 'hi')}</TableHead>
                        <TableHead className="text-xs">Industry</TableHead>
                        <TableHead className="text-xs">Users</TableHead>
                        <TableHead className="text-xs">{t('created_at', language as 'en' | 'ne' | 'hi')}</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrgs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
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
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                onClick={() => openEditOrgDialog(org)}
                              >
                                <Pencil className="h-3 w-3" />
                                Manage
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

          {/* Subscriptions Tab → replaced with RBAC */}
          <TabsContent value="rbac">
            <div className="space-y-4">
              {/* Org selector + Add user */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Role-Based Access Control
                      </CardTitle>
                      <CardDescription>Manage user roles and organization membership</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                        <SelectTrigger className="w-52 h-9 text-xs">
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {orgs.map((org) => (
                            <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="gap-1.5" onClick={() => setAddUserOpen(true)} disabled={!selectedOrg}>
                        <UserPlus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Add User</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Members table */}
              {selectedOrg && (
                <Card>
                  <CardContent className="p-0">
                    {membersLoading ? (
                      <div className="p-6 space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Name</TableHead>
                              <TableHead className="text-xs">Email</TableHead>
                              <TableHead className="text-xs">Role</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Joined</TableHead>
                              <TableHead className="text-xs text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orgMembers.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                                  No members found for this organization
                                </TableCell>
                              </TableRow>
                            ) : (
                              orgMembers.map((member) => (
                                <TableRow key={member.id}>
                                  <TableCell className="font-medium text-sm">{member.name}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-[10px] capitalize">{member.role}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={member.isActive ? 'default' : 'secondary'} className="text-[10px]">
                                      {member.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {new Date(member.joinedAt).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 gap-1 text-xs"
                                        onClick={() => {
                                          setEditMember(member)
                                          setEditRole(member.role)
                                          setEditRoleOpen(true)
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                        Role
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                                        onClick={() => {
                                          setRemoveMember(member)
                                          setRemoveUserOpen(true)
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        Remove
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Subscription management */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">{t('manage_subscriptions', language as 'en' | 'ne' | 'hi')}</CardTitle>
                  <CardDescription>Upgrade or downgrade organization plans</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">{t('organization_name', language as 'en' | 'ne' | 'hi')}</TableHead>
                          <TableHead className="text-xs">{t('current_plan', language as 'en' | 'ne' | 'hi')}</TableHead>
                          <TableHead className="text-xs">{t('status', language as 'en' | 'ne' | 'hi')}</TableHead>
                          <TableHead className="text-xs">Period</TableHead>
                          <TableHead className="text-xs">Change Plan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrgs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
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
                                Monthly
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

              {/* All Memberships Section */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        All User-Organization Assignments
                      </CardTitle>
                      <CardDescription>Complete view of user roles across all organizations</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={loadAllMemberships}
                      disabled={membershipsLoading}
                    >
                      {membershipsLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Load All Memberships
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {allMemberships.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Click "Load All Memberships" to view all user-organization assignments
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">User</TableHead>
                            <TableHead className="text-xs">Email</TableHead>
                            <TableHead className="text-xs">Organization</TableHead>
                            <TableHead className="text-xs">Role</TableHead>
                            <TableHead className="text-xs">Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allMemberships.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="font-medium text-sm">{m.userName}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{m.userEmail}</TableCell>
                              <TableCell className="text-sm">{m.orgName}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] capitalize">{m.role}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(m.joinedAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="system">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SystemRow icon={Database} label="Application" value="Hisab Pro" />
                  <SystemRow icon={Settings} label="Version" value="1.0.0" />
                  <SystemRow icon={Shield} label="Environment" value="Production" badge />
                  <SystemRow icon={Database} label="Database" value="SQLite" />
                  <SystemRow icon={Globe} label="Region" value="Nepal (Asia/Kathmandu)" />
                  <SystemRow icon={DollarSign} label="Currency" value="NPR (रू)" />
                  <SystemRow icon={Clock} label="Server Time" value={new Date().toLocaleString()} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Compliance & Tax
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SystemRow icon={CheckCircle2} label="VAT Rate" value="13%" />
                  <SystemRow icon={CheckCircle2} label="IRD Compliance" value="Ready" badge />
                  <SystemRow icon={CheckCircle2} label="NFRS Compliant" value="Yes" badge />
                  <SystemRow icon={CheckCircle2} label="TDS Support" value="Enabled" badge />
                  <SystemRow icon={CheckCircle2} label="SSF Support" value="Enabled" badge />
                  <SystemRow icon={CheckCircle2} label="Audit Logging" value="Active" badge />
                  <SystemRow icon={Globe} label="Languages" value="EN, NE, HI" />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Global Configuration
                  </CardTitle>
                  <CardDescription>System-wide settings that affect all organizations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Auto-create Chart of Accounts</p>
                      <p className="text-xs text-muted-foreground">Automatically create Nepal-standard COA for new organizations</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Require Email Verification</p>
                      <p className="text-xs text-muted-foreground">Users must verify their email before accessing the app</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Default Organization Plan</p>
                      <p className="text-xs text-muted-foreground">Plan assigned to new organizations</p>
                    </div>
                    <Select defaultValue="free">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Maintenance Mode</p>
                      <p className="text-xs text-muted-foreground">Temporarily disable access for non-admin users</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User to Organization</DialogTitle>
            <DialogDescription>
              Add an existing user by their email address and assign a role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="addUserEmail">User Email *</Label>
              <Input
                id="addUserEmail"
                type="email"
                value={addUserEmail}
                onChange={(e) => setAddUserEmail(e.target.value)}
                placeholder="user@example.com"
              />
              <p className="text-xs text-muted-foreground">The user must already have an account</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="addUserRole">Role *</Label>
              <Select value={addUserRole} onValueChange={setAddUserRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access</SelectItem>
                  <SelectItem value="accountant">Accountant - Manage accounts & entries</SelectItem>
                  <SelectItem value="staff">Staff - Create transactions</SelectItem>
                  <SelectItem value="viewer">Viewer - Read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={addingUser || !addUserEmail.trim()}>
              {addingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {editMember?.name} in this organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Role</Label>
              <Badge variant="outline" className="capitalize">{editMember?.role}</Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">New Role *</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access</SelectItem>
                  <SelectItem value="accountant">Accountant - Manage accounts & entries</SelectItem>
                  <SelectItem value="staff">Staff - Create transactions</SelectItem>
                  <SelectItem value="viewer">Viewer - Read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateRole} disabled={updatingRole}>
              {updatingRole && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Dialog */}
      <Dialog open={removeUserOpen} onOpenChange={setRemoveUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User from Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removeMember?.name} ({removeMember?.email}) from this organization?
              They will lose access to all data in this organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveUserOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveUser} disabled={removingUser}>
              {removingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={editOrgOpen} onOpenChange={setEditOrgOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Organization</DialogTitle>
            <DialogDescription>
              Edit details for {editOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editOrgName" className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Organization Name *
                </Label>
                <Input
                  id="editOrgName"
                  value={editOrgForm.name}
                  onChange={(e) => setEditOrgForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Organization name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOrgPlan">Plan</Label>
                <Select value={editOrgForm.plan} onValueChange={(v) => setEditOrgForm(prev => ({ ...prev, plan: v }))}>
                  <SelectTrigger id="editOrgPlan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOrgMode">Mode</Label>
                <Select value={editOrgForm.mode} onValueChange={(v) => setEditOrgForm(prev => ({ ...prev, mode: v }))}>
                  <SelectTrigger id="editOrgMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOrgIndustry">Industry</Label>
                <Input
                  id="editOrgIndustry"
                  value={editOrgForm.industry}
                  onChange={(e) => setEditOrgForm(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g. trading, manufacturing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOrgLanguage">Language</Label>
                <Select value={editOrgForm.language} onValueChange={(v) => setEditOrgForm(prev => ({ ...prev, language: v }))}>
                  <SelectTrigger id="editOrgLanguage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ne">नेपाली</SelectItem>
                    <SelectItem value="hi">हिंदी</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editOrgAddress" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Address
                </Label>
                <Input
                  id="editOrgAddress"
                  value={editOrgForm.address}
                  onChange={(e) => setEditOrgForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOrgCity">City</Label>
                <Input
                  id="editOrgCity"
                  value={editOrgForm.city}
                  onChange={(e) => setEditOrgForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOrgProvince">Province</Label>
                <Input
                  id="editOrgProvince"
                  value={editOrgForm.province}
                  onChange={(e) => setEditOrgForm(prev => ({ ...prev, province: e.target.value }))}
                  placeholder="Province"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOrgPhone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </Label>
                <Input
                  id="editOrgPhone"
                  value={editOrgForm.phone}
                  onChange={(e) => setEditOrgForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOrgEmail" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Label>
                <Input
                  id="editOrgEmail"
                  type="email"
                  value={editOrgForm.email}
                  onChange={(e) => setEditOrgForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="org@example.com"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">VAT Enabled</p>
                    <p className="text-xs text-muted-foreground">Enable VAT for this organization</p>
                  </div>
                  <Switch
                    checked={editOrgForm.vatEnabled}
                    onCheckedChange={(checked) => setEditOrgForm(prev => ({ ...prev, vatEnabled: checked }))}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrgOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateOrg} disabled={updatingOrg || !editOrgForm.name.trim()}>
              {updatingOrg && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Helper Components
// ============================================================
function SystemRow({ icon: Icon, label, value, badge }: { icon: React.ElementType; label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      {badge ? (
        <Badge variant="secondary" className="text-[10px]">{value}</Badge>
      ) : (
        <span className="text-sm font-medium">{value}</span>
      )}
    </div>
  )
}
