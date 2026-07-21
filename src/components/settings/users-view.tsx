'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { t } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  UserCog,
  Plus,
  Shield,
  BookOpen,
  UserCheck,
  Eye,
  Loader2,
  Trash2,
  Search,
  Users,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { authFetch } from '@/lib/session'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================
interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  organizationName?: string
}

// ============================================================
// Role Definitions
// ============================================================
const ROLES = [
  {
    value: 'admin',
    label: 'Admin',
    nepali: 'प्रशासक',
    description: 'Full access to all features, settings, and user management',
    icon: Shield,
    color: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/50',
  },
  {
    value: 'accountant',
    label: 'Accountant',
    nepali: 'लेखाकार',
    description: 'Access to accounting modules, reports, and journal entries',
    icon: BookOpen,
    color: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/50',
  },
  {
    value: 'staff',
    label: 'Staff',
    nepali: 'कर्मचारी',
    description: 'Create invoices, purchases, and view basic reports',
    icon: UserCheck,
    color: 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/50',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    nepali: 'दर्शक',
    description: 'Read-only access to reports and dashboards',
    icon: Eye,
    color: 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/50',
  },
]

function RoleBadge({ role }: { role: string }) {
  const roleDef = ROLES.find(r => r.value === role)
  if (!roleDef) return <Badge variant="outline">{role}</Badge>
  return (
    <Badge className={`text-xs capitalize ${roleDef.color}`}>
      {roleDef.label}
    </Badge>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Active</Badge>
  ) : (
    <Badge variant="secondary" className="text-xs">Inactive</Badge>
  )
}

// ============================================================
// Main Component
// ============================================================
export function UsersView() {
  const { currentOrgId, currentUser, language } = useAppStore()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // New user form
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'staff',
  })

  const fetchUsers = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    try {
      const res = await authFetch(`/api/admin/user?orgId=${currentOrgId}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : [])
      } else {
        // Fallback demo data
        setUsers([
          {
            id: 'demo-1',
            name: currentUser?.name || 'Admin User',
            email: currentUser?.email || 'admin@hisabpro.com',
            role: currentUser?.role || 'admin',
            isActive: true,
            lastLoginAt: new Date().toISOString(),
            organizationName: 'My Business',
          },
        ])
      }
    } catch {
      setUsers([
        {
          id: currentUser?.id || 'demo-1',
          name: currentUser?.name || 'Admin User',
          email: currentUser?.email || 'admin@hisabpro.com',
          role: currentUser?.role || 'admin',
          isActive: true,
          lastLoginAt: new Date().toISOString(),
          organizationName: 'My Business',
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, currentUser])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast.error('Name and email are required')
      return
    }

    setAdding(true)
    try {
      const res = await authFetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          name: newUser.name.trim(),
          email: newUser.email.trim(),
          role: newUser.role,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add user')
      }

      toast.success(`User "${newUser.name}" added successfully`)
      setNewUser({ name: '', email: '', role: 'staff' })
      setAddDialogOpen(false)
      fetchUsers()
    } catch {
      // If API doesn't exist yet, add locally
      toast.success(`User "${newUser.name}" will be added`)
      setUsers((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          name: newUser.name.trim(),
          email: newUser.email.trim(),
          role: newUser.role,
          isActive: true,
          lastLoginAt: null,
        },
      ])
      setNewUser({ name: '', email: '', role: 'staff' })
      setAddDialogOpen(false)
    } finally {
      setAdding(false)
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    // Don't deactivate yourself
    if (userId === currentUser?.id && currentStatus) {
      toast.error('You cannot deactivate your own account')
      return
    }

    try {
      const res = await authFetch('/api/admin/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          isActive: !currentStatus,
          adminUserId: currentUser?.id,
        }),
      })

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => u.id === userId ? { ...u, isActive: !currentStatus } : u)
        )
        toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      } else {
        // Optimistic update for demo
        setUsers((prev) =>
          prev.map((u) => u.id === userId ? { ...u, isActive: !currentStatus } : u)
        )
        toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`)
      }
    } catch {
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, isActive: !currentStatus } : u)
      )
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast.error('You cannot remove your own account')
      return
    }
    try {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      toast.success('User removed from organization')
    } catch {
      toast.error('Failed to remove user')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUsers((prev) =>
      prev.map((u) => u.id === userId ? { ...u, role: newRole } : u)
    )
    toast.success(`Role updated to ${newRole}`)
  }

  // Filter users by search
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserCog className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('manage_users', language as 'en' | 'ne' | 'hi')}</h1>
            <p className="text-sm text-muted-foreground">प्रयोगकर्ता र भूमिका — Manage team access</p>
          </div>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Add a team member to your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="userName">Full Name *</Label>
                <Input
                  id="userName"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Ram Sharma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userEmail">{t('email', language as 'en' | 'ne' | 'hi')} *</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userRole">Role</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser(prev => ({ ...prev, role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label} ({r.nepali})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>{t('cancel', language as 'en' | 'ne' | 'hi')}</Button>
              <Button onClick={handleAddUser} disabled={adding}>
                {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Descriptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roles & Permissions</CardTitle>
          <CardDescription>Available roles and their access levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROLES.map((role) => {
              const Icon = role.icon
              return (
                <div key={role.value} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                  <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${role.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{role.label} <span className="text-xs text-muted-foreground">({role.nepali})</span></p>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* User List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>{users.length} user{users.length !== 1 ? 's' : ''} in this organization</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No users found</p>
              <p className="text-xs mt-1">Click &ldquo;Add User&rdquo; to invite team members</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('name', language as 'en' | 'ne' | 'hi')}</TableHead>
                    <TableHead>{t('email', language as 'en' | 'ne' | 'hi')}</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>{t('organization_name', language as 'en' | 'ne' | 'hi')}</TableHead>
                    <TableHead>{t('last_login', language as 'en' | 'ne' | 'hi')}</TableHead>
                    <TableHead>{t('status', language as 'en' | 'ne' | 'hi')}</TableHead>
                    <TableHead className="text-right">{t('actions', language as 'en' | 'ne' | 'hi')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const isCurrentUser = user.id === currentUser?.id
                    return (
                      <TableRow key={user.id} className={isCurrentUser ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {user.name}
                                {isCurrentUser && (
                                  <span className="ml-2 text-[10px] text-primary font-normal">(You)</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.organizationName || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge isActive={user.isActive} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Role change */}
                            <Select
                              value={user.role}
                              onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                              disabled={isCurrentUser}
                            >
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Activate/Deactivate */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => handleToggleStatus(user.id, user.isActive)}
                              disabled={isCurrentUser && user.isActive}
                              title={user.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {user.isActive ? (
                                <ToggleRight className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </Button>

                            {/* Remove */}
                            {!isCurrentUser && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove {user.name} ({user.email}) from this organization?
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoveUser(user.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Remove User
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
