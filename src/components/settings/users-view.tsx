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
  EyeOff,
  Loader2,
  Trash2,
  Search,
  Users,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react'
import { authFetch } from '@/lib/session'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================
interface SecureMemberRecord {
  id: string              // UserOrganization id
  userId: string          // User id
  name: string
  nameNepali?: string | null
  email: string           // May be masked if not admin/self
  phone?: string | null   // May be null if not admin/self
  role: string            // Org role (admin, accountant, staff, viewer)
  userGlobalRole: string  // User's global role (super_admin, user)
  isActive: boolean
  lastLoginAt: string | null
  organizationName: string
  isSelf: boolean         // Whether this user is the requesting user
  canSeeFullData: boolean // Whether email/phone are visible
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

function MaskedEmailBadge({ email, canSeeFullData }: { email: string; canSeeFullData: boolean }) {
  if (canSeeFullData) {
    return <span className="text-sm text-muted-foreground">{email}</span>
  }
  return (
    <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
      {email}
      <span title="Email masked for privacy">
        <EyeOff className="h-3 w-3 text-muted-foreground/50" />
      </span>
    </span>
  )
}

// ============================================================
// Main Component
// ============================================================
export function UsersView() {
  const { currentOrgId, currentUser, language } = useAppStore()
  const [members, setMembers] = useState<SecureMemberRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewerRole, setViewerRole] = useState<string | null>(null)
  const [canManageUsers, setCanManageUsers] = useState(false)

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
        setMembers(data.members || [])
        setViewerRole(data.viewerRole || null)
        setCanManageUsers(data.canManageUsers || false)
      } else {
        // Error - show empty state
        setMembers([])
        setCanManageUsers(false)
      }
    } catch {
      setMembers([])
      setCanManageUsers(false)
    } finally {
      setLoading(false)
    }
  }, [currentOrgId])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast.error('Name and email are required')
      return
    }

    if (!canManageUsers) {
      toast.error('Only organization admins can add users')
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add user'
      toast.error(message)
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

    // Only admins/super_admins can toggle status via the super_admin PUT endpoint
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
        setMembers((prev) =>
          prev.map((m) => m.userId === userId ? { ...m, isActive: !currentStatus } : m)
        )
        toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      } else {
        toast.error('Only super admins can toggle user status at the platform level')
      }
    } catch {
      toast.error('Failed to update user status')
    }
  }

  const handleRemoveUser = async (memberId: string, userId: string) => {
    if (userId === currentUser?.id) {
      toast.error('You cannot remove your own account')
      return
    }
    try {
      // Use rbac endpoint for removing from org
      const res = await authFetch('/api/admin/rbac', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser?.id,
          userId,
          organizationId: currentOrgId,
        }),
      })

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
        toast.success('User removed from organization')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to remove user')
      }
    } catch {
      toast.error('Failed to remove user')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!canManageUsers) {
      toast.error('Only organization admins can change roles')
      return
    }

    try {
      const res = await authFetch('/api/admin/rbac', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: currentUser?.id,
          userId,
          organizationId: currentOrgId,
          role: newRole,
        }),
      })

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => m.userId === userId ? { ...m, role: newRole } : m)
        )
        toast.success(`Role updated to ${newRole}`)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to update role')
      }
    } catch {
      toast.error('Failed to update role')
    }
  }

  // Filter users by search
  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Determine if current user is super_admin
  const isSuperAdmin = currentUser?.role === 'super_admin'

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

        {canManageUsers && (
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
        )}
      </div>

      {/* Privacy Notice */}
      {!canManageUsers && members.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Some personal data (email, phone) is hidden for privacy. Only organization admins and the user themselves can see full details.
            </p>
          </CardContent>
        </Card>
      )}

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
          <CardDescription>{members.length} member{members.length !== 1 ? 's' : ''} in this organization</CardDescription>
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
          ) : filteredMembers.length === 0 ? (
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
                    <TableHead>{t('last_login', language as 'en' | 'ne' | 'hi')}</TableHead>
                    <TableHead>{t('status', language as 'en' | 'ne' | 'hi')}</TableHead>
                    {canManageUsers && (
                      <TableHead className="text-right">{t('actions', language as 'en' | 'ne' | 'hi')}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => {
                    const isCurrentUser = member.userId === currentUser?.id
                    return (
                      <TableRow key={member.id} className={isCurrentUser ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {member.name}
                                {isCurrentUser && (
                                  <span className="ml-2 text-[10px] text-primary font-normal">(You)</span>
                                )}
                              </p>
                              {member.nameNepali && member.canSeeFullData && (
                                <p className="text-xs text-muted-foreground">{member.nameNepali}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <MaskedEmailBadge email={member.email} canSeeFullData={member.canSeeFullData} />
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={member.role} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.lastLoginAt
                            ? new Date(member.lastLoginAt).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge isActive={member.isActive} />
                        </TableCell>
                        {canManageUsers && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Role change - only for non-self users */}
                              <Select
                                value={member.role}
                                onValueChange={(newRole) => handleRoleChange(member.userId, newRole)}
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

                              {/* Activate/Deactivate (only super_admin via PUT endpoint) */}
                              {isSuperAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() => handleToggleStatus(member.userId, member.isActive)}
                                  disabled={isCurrentUser && member.isActive}
                                  title={member.isActive ? 'Deactivate' : 'Activate'}
                                >
                                  {member.isActive ? (
                                    <ToggleRight className="h-3.5 w-3.5 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </Button>
                              )}

                              {/* Remove from org */}
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
                                        Are you sure you want to remove {member.name} from this organization?
                                        {member.canSeeFullData && (
                                          <span> ({member.email})</span>
                                        )}
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleRemoveUser(member.id, member.userId)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Remove User
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        )}
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
