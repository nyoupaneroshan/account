'use client'

import { useAppStore } from '@/store/app-store'
import { formatNPR } from '@/lib/nepal-accounting'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  Plus,
  Search,
  Receipt,
  Truck,
  Eye,
  Pencil,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

// ============================================================
// Types
// ============================================================
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
  currentBalance: number
  balanceType: string | null
  isTdsApplicable: boolean
  creditLimit: number | null
  isActive: boolean
}

type FilterTab = 'all' | 'customer' | 'supplier' | 'employee'

// ============================================================
// Badge helper
// ============================================================
function PartyTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    supplier: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    both: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    employee: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  }
  return (
    <Badge className={`text-xs capitalize ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
      {type}
    </Badge>
  )
}

// ============================================================
// Main Component
// ============================================================
export function PartyList() {
  const { setActiveModule, currentOrgId } = useAppStore()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(false)

  const fetchParties = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ orgId: currentOrgId })
      if (activeTab !== 'all') params.set('partyType', activeTab)
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/parties?${params}`)
      if (res.ok) {
        const data = await res.json()
        setParties(Array.isArray(data) ? data : [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, activeTab, search])

  useEffect(() => { fetchParties() }, [fetchParties])

  const tabs: { key: FilterTab; label: string; nepali: string }[] = [
    { key: 'all', label: 'All', nepali: 'सबै' },
    { key: 'customer', label: 'Customers', nepali: 'ग्राहक' },
    { key: 'supplier', label: 'Suppliers', nepali: 'आपूर्तिकर्ता' },
    { key: 'employee', label: 'Employees', nepali: 'कर्मचारी' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers & Suppliers</h1>
          <p className="text-sm text-muted-foreground">ग्राहक र आपूर्तिकर्ता — Manage your business contacts</p>
        </div>
        <Button onClick={() => setActiveModule('party-new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Party
        </Button>
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
            <span className="text-[10px] ml-1 opacity-60">({tab.nepali})</span>
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
          ) : parties.length === 0 ? (
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parties.map((party) => (
                    <TableRow key={party.id}>
                      <TableCell>
                        <button
                          className="font-medium text-left hover:text-primary transition-colors"
                          onClick={() => {
                            // Future: navigate to party detail
                          }}
                        >
                          {party.name}
                          {party.nameNepali && (
                            <span className="text-xs text-muted-foreground ml-1.5">({party.nameNepali})</span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{party.panNumber || '-'}</TableCell>
                      <TableCell>
                        <PartyTypeBadge type={party.partyType} />
                      </TableCell>
                      <TableCell className="text-sm">{party.phone || '-'}</TableCell>
                      <TableCell className="text-right">
                        {party.currentBalance === 0 ? (
                          <span className="text-muted-foreground font-mono text-sm">-</span>
                        ) : (
                          <span className={`font-mono text-sm ${party.currentBalance > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                            {party.currentBalance > 0 ? '↑ ' : '↓ '}
                            {formatNPR(Math.abs(party.currentBalance))}
                            <span className="text-[10px] ml-1 text-muted-foreground">
                              {party.currentBalance > 0 ? 'receivable' : 'payable'}
                            </span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View/Edit">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {(party.partyType === 'customer' || party.partyType === 'both') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Create Invoice"
                              onClick={() => setActiveModule('invoice-new')}
                            >
                              <Receipt className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(party.partyType === 'supplier' || party.partyType === 'both') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Create Purchase"
                              onClick={() => setActiveModule('purchase-new')}
                            >
                              <Truck className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => setActiveModule('party-new')}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Summary */}
      {!loading && parties.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{parties.length} party{parties.length !== 1 ? 'ies' : 'y'}</span>
          <span>
            Receivable: {formatNPR(parties.filter(p => p.currentBalance > 0).reduce((s, p) => s + p.currentBalance, 0))}
          </span>
          <span>
            Payable: {formatNPR(Math.abs(parties.filter(p => p.currentBalance < 0).reduce((s, p) => s + p.currentBalance, 0)))}
          </span>
        </div>
      )}
    </div>
  )
}
