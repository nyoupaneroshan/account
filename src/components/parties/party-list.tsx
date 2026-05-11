'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { formatNPR } from '@/lib/nepal-accounting'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Users, Plus, Search, Receipt, Truck, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────
interface Party {
  id: string
  name: string
  nameNepali: string | null
  panNumber: string | null
  partyType: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  province: string | null
  currentBalance: number
  balanceType: string | null
  isTdsApplicable: boolean
  tdsRate: number | null
  creditLimit: number | null
  contactPerson: string | null
  bankName: string | null
  bankAccount: string | null
  isActive: boolean
}

type FilterTab = 'all' | 'customer' | 'supplier' | 'employee'

// ─── Badge helper ─────────────────────────────────────────────
function PartyTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    supplier: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    both: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    employee: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  }
  return (
    <Badge className={`text-xs capitalize border-0 ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
      {type}
    </Badge>
  )
}

const ITEMS_PER_PAGE = 15

// ─── Component ────────────────────────────────────────────────
export function PartyList() {
  const router = useRouter()
  const { currentOrgId } = useAppStore()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchParties = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ orgId: currentOrgId })
      if (activeTab !== 'all') params.set('partyType', activeTab)
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/parties?${params}`)
      if (res.ok) {
        const data = await res.json()
        setParties(Array.isArray(data) ? data : [])
      } else {
        setError('Failed to load parties')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, activeTab, search])

  useEffect(() => { fetchParties() }, [fetchParties])
  useEffect(() => { setPage(1) }, [activeTab, search])

  // Delete party
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch('/api/parties', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.deactivated ? 'Party deactivated (has existing transactions)' : 'Party deleted successfully')
        setDeleteTarget(null)
        fetchParties()
      } else {
        toast.error(data.error || 'Failed to delete party')
      }
    } catch {
      toast.error('Failed to delete party')
    } finally {
      setDeleting(false)
    }
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(parties.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginatedParties = parties.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  // Summary stats
  const totalReceivable = parties
    .filter((p) => p.currentBalance > 0)
    .reduce((s, p) => s + p.currentBalance, 0)
  const totalPayable = Math.abs(
    parties.filter((p) => p.currentBalance < 0).reduce((s, p) => s + p.currentBalance, 0),
  )

  const tabs: { key: FilterTab; label: string; nepali: string }[] = [
    { key: 'all', label: 'All', nepali: '\u0938\u092C\u0948' },
    { key: 'customer', label: 'Customers', nepali: '\u0917\u094D\u0930\u093E\u0939\u0915' },
    { key: 'supplier', label: 'Suppliers', nepali: '\u0906\u092A\u0942\u0930\u094D\u0924\u093F\u0915\u0930\u094D\u0924\u093E' },
    { key: 'employee', label: 'Employees', nepali: '\u0915\u0930\u094D\u092E\u091A\u093E\u0930\u0940' },
  ]

  const handleViewDetail = (party: Party) => {
    setSelectedParty(party)
    setDetailOpen(true)
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers & Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your business contacts and their balances
          </p>
        </div>
        <Button onClick={() => router.push('/parties/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Party
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Parties</p>
            <p className="text-2xl font-bold">{parties.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpRight className="size-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Receivable</p>
            </div>
            <p className="text-xl font-bold text-green-600">{formatNPR(totalReceivable)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownRight className="size-4 text-red-600" />
              <p className="text-xs text-muted-foreground">Payable</p>
            </div>
            <p className="text-xl font-bold text-red-600">{formatNPR(totalPayable)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Customers</p>
            <p className="text-2xl font-bold">
              {parties.filter((p) => p.partyType === 'customer' || p.partyType === 'both').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, PAN, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <Users className="size-12 text-red-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-red-600">{error}</h3>
              <Button variant="outline" className="mt-4" onClick={fetchParties}>
                Retry
              </Button>
            </div>
          ) : paginatedParties.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No parties found</p>
              <p className="text-xs mt-1">
                {search || activeTab !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Click "Add Party" to create your first contact'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>PAN</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden sm:table-cell">Phone</TableHead>
                      <TableHead className="hidden md:table-cell">City</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedParties.map((party) => (
                      <TableRow
                        key={party.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewDetail(party)}
                      >
                        <TableCell>
                          <div>
                            <span className="font-medium">{party.name}</span>
                            {party.nameNepali && (
                              <span className="text-xs text-muted-foreground ml-1.5">
                                ({party.nameNepali})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {party.panNumber || '\u2014'}
                        </TableCell>
                        <TableCell>
                          <PartyTypeBadge type={party.partyType} />
                        </TableCell>
                        <TableCell className="text-sm hidden sm:table-cell">
                          {party.phone || '\u2014'}
                        </TableCell>
                        <TableCell className="text-sm hidden md:table-cell">
                          {party.city || '\u2014'}
                        </TableCell>
                        <TableCell className="text-right">
                          {party.currentBalance === 0 ? (
                            <span className="text-muted-foreground font-mono text-sm">\u2014</span>
                          ) : (
                            <span
                              className={cn(
                                'font-mono text-sm',
                                party.currentBalance > 0
                                  ? 'text-green-700 dark:text-green-400'
                                  : 'text-red-700 dark:text-red-400',
                              )}
                            >
                              {party.currentBalance > 0 ? '\u2191 ' : '\u2193 '}
                              {formatNPR(Math.abs(party.currentBalance))}
                              <span className="text-[10px] ml-1 text-muted-foreground">
                                {party.currentBalance > 0 ? 'receivable' : 'payable'}
                              </span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="View Details"
                              onClick={() => handleViewDetail(party)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Edit"
                              onClick={() => router.push(`/parties/new?edit=${party.id}`)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Delete"
                              onClick={() => setDeleteTarget(party)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}\u2013
                    {Math.min(currentPage * ITEMS_PER_PAGE, parties.length)} of {parties.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm">{currentPage} / {totalPages}</span>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Party Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Party Details</DialogTitle>
          </DialogHeader>
          {selectedParty && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center font-bold text-lg">
                  {selectedParty.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{selectedParty.name}</p>
                  {selectedParty.nameNepali && (
                    <p className="text-sm text-muted-foreground">{selectedParty.nameNepali}</p>
                  )}
                </div>
                <PartyTypeBadge type={selectedParty.partyType} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">PAN Number</p>
                  <p className="font-mono">{selectedParty.panNumber || '\u2014'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p>{selectedParty.phone || '\u2014'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="truncate">{selectedParty.email || '\u2014'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">City</p>
                  <p>{selectedParty.city || '\u2014'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Contact Person</p>
                  <p>{selectedParty.contactPerson || '\u2014'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Credit Limit</p>
                  <p>{selectedParty.creditLimit ? formatNPR(selectedParty.creditLimit) : '\u2014'}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Current Balance</p>
                {selectedParty.currentBalance === 0 ? (
                  <p className="text-muted-foreground">No outstanding balance</p>
                ) : (
                  <div
                    className={cn(
                      'p-3 rounded-lg',
                      selectedParty.currentBalance > 0
                        ? 'bg-green-50 dark:bg-green-950'
                        : 'bg-red-50 dark:bg-red-950',
                    )}
                  >
                    <p
                      className={cn(
                        'text-2xl font-bold',
                        selectedParty.currentBalance > 0
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-700 dark:text-red-400',
                      )}
                    >
                      {formatNPR(Math.abs(selectedParty.currentBalance))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedParty.currentBalance > 0
                        ? 'Amount receivable from this party'
                        : 'Amount payable to this party'}
                    </p>
                  </div>
                )}
              </div>

              {selectedParty.isTdsApplicable && (
                <div className="text-sm">
                  <p className="text-muted-foreground text-xs">TDS Applicable</p>
                  <p>Yes ({selectedParty.tdsRate || 0}% rate)</p>
                </div>
              )}

              {selectedParty.bankName && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Bank Name</p>
                    <p>{selectedParty.bankName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Account Number</p>
                    <p className="font-mono">{selectedParty.bankAccount || '\u2014'}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailOpen(false)
                    router.push(`/parties/new?edit=${selectedParty.id}`)
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
                {(selectedParty.partyType === 'customer' || selectedParty.partyType === 'both') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailOpen(false)
                      router.push('/invoices/new')
                    }}
                  >
                    <Receipt className="h-3.5 w-3.5 mr-1.5" />
                    Create Invoice
                  </Button>
                )}
                {(selectedParty.partyType === 'supplier' || selectedParty.partyType === 'both') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailOpen(false)
                      router.push('/purchases/new')
                    }}
                  >
                    <Truck className="h-3.5 w-3.5 mr-1.5" />
                    Create Purchase
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Party</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
              {deleteTarget?.currentBalance !== 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  This party has an outstanding balance. It will be deactivated instead of deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
