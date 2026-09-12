'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { formatNPR } from '@/lib/nepal-accounting'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight,
  ShieldCheck, Server, Send, AlertCircle, FileText, Settings,
} from 'lucide-react'
import { authFetch } from '@/lib/session'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function CbmsMonitorView() {
  const { currentOrgId } = useAppStore()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncingAll, setSyncingAll] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const fetchCbmsData = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    try {
      const res = await authFetch(`/api/cbms?orgId=${currentOrgId}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        toast.error('Failed to load CBMS monitor data')
      }
    } catch {
      toast.error('Network error loading CBMS monitor')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId])

  useEffect(() => {
    fetchCbmsData()
  }, [fetchCbmsData])

  // One-click batch sync
  const handleBatchSync = async () => {
    if (!currentOrgId) return
    setSyncingAll(true)
    try {
      const res = await authFetch('/api/cbms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrgId, batch: true }),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(`Batch Sync Complete: ${result.synced} sent, ${result.failed} failed out of ${result.total}`)
        fetchCbmsData()
      } else {
        toast.error(result.error || 'Batch sync failed')
      }
    } catch {
      toast.error('Network error during batch sync')
    } finally {
      setSyncingAll(false)
    }
  }

  // Single bill sync
  const handleSingleSync = async (invoiceId: string) => {
    setSyncingId(invoiceId)
    try {
      const res = await authFetch('/api/cbms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(`CBMS Synced: Code ${result.responseCode} - ${result.message}`)
        fetchCbmsData()
      } else {
        toast.error(`Sync Failed: ${result.message || 'Error communicating with IRD'}`)
        fetchCbmsData()
      }
    } catch {
      toast.error('Failed to communicate with IRD CBMS')
    } finally {
      setSyncingId(null)
    }
  }

  // Test connection to IRD
  const handleTestConnection = async () => {
    if (!currentOrgId) return
    setTestingConnection(true)
    try {
      const res = await authFetch('/api/cbms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrgId }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(`IRD Connection OK: Code ${result.responseCode} - ${result.message}`)
      } else {
        toast.error(`IRD Connection Failed: ${result.message}`)
      }
    } catch {
      toast.error('Network error while testing IRD connection')
    } finally {
      setTestingConnection(false)
    }
  }

  const org = data?.organization
  const stats = data?.stats || {
    totalInvoices: 0,
    syncedInvoices: 0,
    pendingInvoices: 0,
    failedInvoices: 0,
    syncRate: 0,
    totalCreditNotes: 0,
    syncedCreditNotes: 0,
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              CBMS Real-time Sync Monitor (केन्द्रीय बीजक अनुगमन प्रणाली)
            </h1>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-mono',
                org?.cbmsIsSandbox
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300',
              )}
            >
              {org?.cbmsIsSandbox ? 'Sandbox Mode' : 'Production Mode'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Live Central Billing Monitoring System API telemetry, transmission logs, and automatic re-sync queues
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={testingConnection}
          >
            <Server className={cn('size-4 mr-2 text-primary', testingConnection && 'animate-pulse')} />
            {testingConnection ? 'Testing IRD...' : 'Test IRD Server'}
          </Button>

          <Button
            size="sm"
            onClick={handleBatchSync}
            disabled={syncingAll || stats.pendingInvoices === 0}
            className="gap-1.5"
          >
            <Send className={cn('size-4 mr-1', syncingAll && 'animate-spin')} />
            {syncingAll ? 'Syncing...' : `Sync All Pending (${stats.pendingInvoices})`}
          </Button>
        </div>
      </div>

      {/* Health & Configuration Card */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'size-10 rounded-full flex items-center justify-center shrink-0',
              org?.cbmsEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
            )}>
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{org?.name}</span>
                <span className="text-xs font-mono bg-background px-2 py-0.5 rounded border">
                  PAN: {org?.panNumber || 'Not set'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Code: {org?.irdSoftwareCode || 'HISAB_PRO_V1'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xl">
                API Endpoint: <span className="font-mono text-[11px]">{org?.cbmsUrl || 'https://cbapi.ird.gov.np/api/bill'}</span>
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/settings')}
            className="text-xs shrink-0"
          >
            <Settings className="size-3.5 mr-1" />
            Configure CBMS
          </Button>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">CBMS Sync Rate</p>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold mt-1 text-emerald-600">{stats.syncRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.syncedInvoices} of {stats.totalInvoices} bills synced
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Pending in Queue</p>
              <Send className="size-4 text-amber-500" />
            </div>
            <p className="text-3xl font-bold mt-1 text-amber-600">{stats.pendingInvoices}</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting transmission</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Sync Failures</p>
              <AlertTriangle className="size-4 text-rose-500" />
            </div>
            <p className="text-3xl font-bold mt-1 text-rose-600">{stats.failedInvoices}</p>
            <p className="text-xs text-muted-foreground mt-1">Needs automatic/manual retry</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Credit Notes Synced</p>
              <ArrowUpRight className="size-4 text-blue-500" />
            </div>
            <p className="text-3xl font-bold mt-1 text-blue-600">
              {stats.syncedCreditNotes} <span className="text-sm font-normal text-muted-foreground">/ {stats.totalCreditNotes}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Sent to /api/billreturn</p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Needing Attention (Pending & Failed) */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-500" />
                Queue Requiring Sync (प्रसारण बाँकी वा असफल बीजकहरू)
              </CardTitle>
              <CardDescription className="text-xs">
                Invoices that must be synced to IRD to avoid non-compliance penalties
              </CardDescription>
            </div>
            {data?.attentionInvoices?.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={handleBatchSync}
                disabled={syncingAll}
              >
                Sync All ({data.attentionInvoices.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.attentionInvoices || data.attentionInvoices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-medium text-foreground">All Invoices Synchronized (सबै बीजक प्रमाणीकरण भएको छ)</p>
              <p className="text-xs mt-0.5">There are zero pending or failed invoices in the transmission queue.</p>
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice # (बीजक नं.)</TableHead>
                  <TableHead>Date BS / AD</TableHead>
                  <TableHead className="text-right">Amount (रकम)</TableHead>
                  <TableHead>Sync Status</TableHead>
                  <TableHead>Response Code</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.attentionInvoices.map((inv: any) => {
                  const isSyncing = syncingId === inv.id
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell>
                        <div className="text-xs">{inv.dateBS || 'N/A'}</div>
                        <div className="text-[10px] text-muted-foreground">{inv.date?.slice(0, 10)}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatNPR(inv.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-mono',
                            inv.syncStatus === 'failed'
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : 'bg-amber-50 text-amber-700 border-amber-300',
                          )}
                        >
                          {inv.syncStatus?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs" title={inv.syncResponseMessage}>
                          {inv.syncResponseCode || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{inv.syncAttempts || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleSingleSync(inv.id)}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={cn('size-3', isSyncing && 'animate-spin')} />
                          {isSyncing ? 'Syncing...' : 'Sync to IRD'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CBMS Live Audit Logs */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="size-4 text-primary" />
                Recent CBMS Transmission Logs (प्रसारण लगहरू)
              </CardTitle>
              <CardDescription className="text-xs">
                Audit trail of all HTTP calls to IRD Central Billing Monitoring System
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={fetchCbmsData}
              disabled={loading}
            >
              <RefreshCw className={cn('size-3.5 mr-1', loading && 'animate-spin')} />
              Refresh Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.recentLogs || data.recentLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="size-8 mx-auto mb-2 opacity-30" />
              <p>No transmission logs recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Bill / Ref #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Server Response Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentLogs.map((log: any) => {
                    const isSuccess = log.status === 'success'
                    const code = log.responseCode

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground font-mono whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleTimeString()} {new Date(log.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono font-medium">{log.billNo}</TableCell>
                        <TableCell className="capitalize">{log.syncType.replace('_', ' ')}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              isSuccess
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-rose-50 text-rose-700 border-rose-300',
                            )}
                          >
                            {isSuccess ? 'Success' : 'Failed'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-semibold">
                          <span className={cn(
                            code === 200 ? 'text-emerald-600' : 'text-rose-600',
                          )}>
                            {code || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate" title={log.responseMessage || ''}>
                          {log.responseMessage || log.responseBody || '—'}
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
