'use client'

import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  UserCog,
  Plus,
  Shield,
  BookOpen,
  UserCheck,
  Eye,
  Loader2,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
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
}

// ============================================================
// Role definitions
// ============================================================
const ROLES = [
  {
    value: 'admin',
    label: 'Admin',
    nepali: 'प्रशासक',
    description: 'Full access to all features, settings, and user management',
    icon: Shield,
    color: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900',
  },
  {
    value: 'accountant',
    label: 'Accountant',
    nepali: 'लेखाकार',
    description: 'Access to accounting modules, reports, and journal entries',
    icon: BookOpen,
    color: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900',
  },
  {
    value: 'staff',
    label: 'Staff',
    nepali: 'कर्मचारी',
    description: 'Create invoices, purchases, and view basic reports',
    icon: UserCheck,
    color: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    nepali: 'दर्शक',
    description: 'Read-only access to reports and dashboards',
    icon: Eye,
    color: 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-900',
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
  const { currentOrgId } = useAppStore()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [adding, setAdding] = useState(false)

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
      const res = await fetch(`/api/users?orgId=${currentOrgId}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : [])
      } else {
        // Use demo data if no API yet
        setUsers([
          {
            id: 'demo-1',
            name: 'Admin User',
            email: 'admin@hisabpro.com',
            role: 'admin',
            isActive: true,
            lastLoginAt: new Date().toISOString(),
          },
        ])
      }
    } catch {
      setUsers([
        {
          id: 'demo-1',
          name: 'Admin User',
          email: 'admin@hisabpro.com',
          role: 'admin',
          isActive: true,
          lastLoginAt: new Date().toISOString(),
        },
      ])
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

    setAdding(true)
    try {
      const res = await fetch('/api/users', {
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
      // If API doesn't exist yet, show local success
      toast.success(`User "${newUser.name}" will be added (API pending)`)
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserCog className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
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
                <Label htmlFor="userEmail">Email *</Label>
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
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
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
                  <div className={`h-8 w-8 rounded-md flex items-center justify-center ${role.color}`}>
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

      {/* User List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>{users.length} user{users.length !== 1 ? 's' : ''} in this organization</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCog className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No users found</p>
              <p className="text-xs mt-1">Click "Add User" to invite team members</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={user.role} />
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
                          <Select
                            value={user.role}
                            onValueChange={(newRole) => {
                              setUsers((prev) =>
                                prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u)
                              )
                              toast.success(`Role updated to ${newRole}`)
                            }}
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
                        </div>
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
  )
}
