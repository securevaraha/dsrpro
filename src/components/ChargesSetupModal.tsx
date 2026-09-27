'use client'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { History, CalendarClock, ShieldCheck, CheckCircle2, AlertTriangle, Download, RefreshCw } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { DatePicker } from '@/components/ui/date-picker'

// Admin panel for date-wise POS charges:
//   • Monthly Update  – set new Charges / Bank / VAT for many machines, effective from a date
//   • Rates History   – read-only audit log of every rate change
//   • Safety & Setup  – one-time migration with status → dry run → run → verify

export type ChargesTab = 'bulk' | 'history' | 'migration'

interface Props {
  open: boolean
  onClose: () => void
  initialTab?: ChargesTab
  machineFilter?: string // terminalId to pre-filter the history
  brands: { _id: string; name: string }[]
  segments: { _id: string; name: string }[]
  onChanged?: () => void
}

interface MigrationStatus {
  machinesTotal: number
  machinesWithHistory: number
  machinesPending: number
  receiptsLinked: number
  receiptsFrozen: number
  receiptsPending: number
  receiptsOrphaned: number
  migrated: boolean
}

const pct = (v: any) => `${Number(v || 0).toFixed(2)}%`
const fmtDay = (d: any) => (d ? format(new Date(d), 'dd-MMM-yyyy') : '—')
const fmtEff = (d: any) => (d && new Date(d).getUTCFullYear() <= 2000 ? 'Initial' : fmtDay(d))
const todayStr = () => format(new Date(), 'yyyy-MM-dd')
const firstOfMonth = (offset = 0) => {
  const d = new Date()
  return format(new Date(d.getFullYear(), d.getMonth() + offset, 1), 'yyyy-MM-dd')
}

const statusBadge: Record<string, string> = {
  current: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  past: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export default function ChargesSetupModal({ open, onClose, initialTab = 'bulk', machineFilter = '', brands, segments, onChanged }: Props) {
  const [tab, setTab] = useState<ChargesTab>(initialTab)
  const [status, setStatus] = useState<MigrationStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [allBrands, setAllBrands] = useState(brands)
  const [allSegments, setAllSegments] = useState(segments)

  useEffect(() => {
    if (!open) return
    setTab(initialTab)
    loadStatus()
    // Load the full lists (the page's brand list can be narrowed to one segment).
    fetchWithAuth('/api/brands').then((r) => r.ok && r.json()).then((d) => d?.brands && setAllBrands(d.brands)).catch(() => {})
    fetchWithAuth('/api/segments').then((r) => r.ok && r.json()).then((d) => d?.segments && setAllSegments(d.segments)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTab])

  const loadStatus = async () => {
    setStatusLoading(true)
    try {
      const r = await fetchWithAuth('/api/migrate/pos-charge-history')
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Status check failed')
      setStatus(data)
      return data as MigrationStatus
    } catch (e: any) {
      toast.error(e.message || 'Status check failed')
      return null
    } finally {
      setStatusLoading(false)
    }
  }

  if (!open) return null

  const tabs: { key: ChargesTab; label: string; icon: any }[] = [
    { key: 'bulk', label: 'Monthly Update', icon: CalendarClock },
    { key: 'history', label: 'Rates History', icon: History },
    { key: 'migration', label: 'Safety & Setup', icon: ShieldCheck },
  ]

  return (
    <div className="modal-overlay">
      <div className="modal-content form-modal">
        <div className="modal-header">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Charges Setup</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Rates are date-wise: every receipt keeps the rates of its own date. Changing rates never alters old receipts.
            </p>
          </div>
          <button type="button" onClick={onClose} className="modal-close-btn">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {status && !status.migrated && tab !== 'migration' && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              One-time setup is not finished yet ({status.machinesPending} machine(s), {status.receiptsPending} receipt(s) pending).
              Complete it before changing any rates so old receipts are locked to their current rates.{' '}
              <button type="button" className="underline font-semibold" onClick={() => setTab('migration')}>Open Safety &amp; Setup</button>
            </div>
          </div>
        )}

        <div className="flex gap-1 mb-5 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === key
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'bulk' && (
          <BulkUpdateTab
            brands={allBrands}
            segments={allSegments}
            migrated={!!status?.migrated}
            onApplied={() => { onChanged?.(); setTab('history') }}
          />
        )}
        {tab === 'history' && <HistoryTab machineFilter={machineFilter} />}
        {tab === 'migration' && (
          <MigrationTab status={status} statusLoading={statusLoading} reloadStatus={loadStatus} onDone={() => onChanged?.()} />
        )}
      </div>
    </div>
  )
}

// ─── Monthly / bulk update ──────────────────────────────────────────────────
function BulkUpdateTab({ brands, segments, migrated, onApplied }: {
  brands: { _id: string; name: string }[]
  segments: { _id: string; name: string }[]
  migrated: boolean
  onApplied: () => void
}) {
  const [scopeType, setScopeType] = useState<'all' | 'brand' | 'segment'>('all')
  const [scopeValue, setScopeValue] = useState('')
  const [rates, setRates] = useState({ commissionPercentage: '', bankCharges: '', vatPercentage: '' })
  const [effectiveFrom, setEffectiveFrom] = useState(firstOfMonth(0))
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState<any | null>(null)
  const [busy, setBusy] = useState<'' | 'preview' | 'apply'>('')

  // Any edit invalidates the preview, so Apply always matches what was shown.
  useEffect(() => { setPreview(null) }, [scopeType, scopeValue, rates, effectiveFrom])

  const buildBody = (dryRun: boolean) => ({
    scope: scopeType === 'all' ? { all: true } : { [scopeType]: scopeValue },
    ...rates,
    effectiveFrom,
    note: note || `Monthly rate update from ${effectiveFrom}`,
    dryRun,
  })

  const run = async (dryRun: boolean) => {
    if (scopeType !== 'all' && !scopeValue) return toast.error(`Select a ${scopeType}`)
    if (!rates.commissionPercentage && !rates.bankCharges && !rates.vatPercentage) {
      return toast.error('Enter at least one rate to change')
    }
    setBusy(dryRun ? 'preview' : 'apply')
    try {
      const r = await fetchWithAuth('/api/pos-machines/bulk-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(dryRun)),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Request failed')
      if (dryRun) setPreview(data)
      else {
        toast.success(data.message)
        setPreview(null)
        setRates({ commissionPercentage: '', bankCharges: '', vatPercentage: '' })
        setNote('')
        onApplied()
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy('')
    }
  }

  const rateInput = (key: keyof typeof rates, label: string) => (
    <div>
      <label className="form-label">{label}</label>
      <input
        type="number" step="0.01" min="0" max="100" className="form-input" placeholder="Keep current"
        value={rates[key]}
        onChange={(e) => {
          const v = e.target.value
          if (v === '' || (parseFloat(v) >= 0 && parseFloat(v) <= 100)) setRates({ ...rates, [key]: v })
        }}
      />
    </div>
  )

  const backdated = effectiveFrom < todayStr()
  const changedRows = (preview?.preview || []).filter((p: any) => p.changed)

  return (
    <div className="space-y-5">
      <div className="form-section">
        <p className="form-section-title">1. Which machines</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Apply to</label>
            <select className="form-select" value={scopeType} onChange={(e) => { setScopeType(e.target.value as any); setScopeValue('') }}>
              <option value="all">All POS machines</option>
              <option value="brand">One company / brand</option>
              <option value="segment">One segment</option>
            </select>
          </div>
          {scopeType !== 'all' && (
            <div>
              <label className="form-label">{scopeType === 'brand' ? 'Brand' : 'Segment'}</label>
              <select className="form-select" value={scopeValue} onChange={(e) => setScopeValue(e.target.value)}>
                <option value="">Select…</option>
                {(scopeType === 'brand' ? brands : segments).map((o) => <option key={o._id} value={o.name}>{o.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="form-section">
        <p className="form-section-title">2. New rates (leave blank to keep each machine's own rate)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {rateInput('commissionPercentage', 'Charges (%)')}
          {rateInput('bankCharges', 'Bank Charges (%)')}
          {rateInput('vatPercentage', 'VAT (%)')}
        </div>
      </div>

      <div className="form-section">
        <p className="form-section-title">3. Effective from</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <DatePicker label="Effective from" required value={effectiveFrom} onChange={setEffectiveFrom} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={() => setEffectiveFrom(firstOfMonth(0))}>1st of this month</button>
            <button type="button" className="btn-secondary text-xs" onClick={() => setEffectiveFrom(firstOfMonth(1))}>1st of next month</button>
            <button type="button" className="btn-secondary text-xs" onClick={() => setEffectiveFrom(todayStr())}>Today</button>
          </div>
        </div>
        <div>
          <label className="form-label">Note (optional)</label>
          <input type="text" className="form-input" placeholder="e.g. October bank rate revision" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Receipts dated before {fmtDay(effectiveFrom)} keep their old rates. New receipts dated {fmtDay(effectiveFrom)} or later use the new rates.
          {backdated && (
            <span className="block mt-1 text-amber-700 dark:text-amber-300">
              This date is in the past. Receipts already entered between {fmtDay(effectiveFrom)} and today are <b>not</b> re-priced here —
              use Edit on a single machine with “re-price existing receipts” if that is needed.
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-secondary inline-flex items-center gap-2" disabled={!!busy} onClick={() => run(true)}>
          {busy === 'preview' ? 'Checking…' : 'Preview changes'}
        </button>
      </div>

      {preview && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <b>{preview.changed}</b> of {preview.matched} machine(s) will get new rates from <b>{fmtDay(preview.effectiveFrom)}</b>
            {preview.unchanged > 0 && <> · {preview.unchanged} already have these rates (skipped)</>}
          </p>
          {changedRows.length > 0 && (
            <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700 max-h-72">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Machine</th>
                    <th className="px-2 py-1.5 text-right">Charges %</th>
                    <th className="px-2 py-1.5 text-right">Bank %</th>
                    <th className="px-2 py-1.5 text-right">VAT %</th>
                  </tr>
                </thead>
                <tbody>
                  {changedRows.map((p: any) => (
                    <tr key={p._id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-2 py-1.5">{p.machineName || '—'} <span className="text-gray-400">({p.terminalId})</span></td>
                      {(['commissionPercentage', 'bankCharges', 'vatPercentage'] as const).map((k) => (
                        <td key={k} className="px-2 py-1.5 text-right whitespace-nowrap">
                          {p.before[k] === p.after[k]
                            ? pct(p.after[k])
                            : <><span className="line-through text-gray-400">{pct(p.before[k])}</span> → <b>{pct(p.after[k])}</b></>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!migrated && (
            <p className="text-xs text-amber-700 dark:text-amber-300">Finish the one-time setup (Safety &amp; Setup tab) before applying.</p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              className="dubai-button inline-flex items-center gap-2 disabled:opacity-50"
              disabled={!!busy || preview.changed === 0 || !migrated}
              onClick={() => run(false)}
            >
              {busy === 'apply' ? 'Applying…' : `Apply to ${preview.changed} machine(s)`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── History / audit log ────────────────────────────────────────────────────
function HistoryTab({ machineFilter }: { machineFilter: string }) {
  const [entries, setEntries] = useState<any[]>([])
  const [withoutHistory, setWithoutHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(machineFilter)
  const [statusFilter, setStatusFilter] = useState('all')
  const [hideBaseline, setHideBaseline] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetchWithAuth('/api/pos-machines/charge-history')
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to load history')
      setEntries(data.entries || [])
      setWithoutHistory(data.machinesWithoutHistory || [])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])
  useEffect(() => { setSearch(machineFilter) }, [machineFilter])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) =>
      (!q || [e.machineName, e.terminalId, e.brand, e.segment, e.note, e.changedBy].some((v) => String(v || '').toLowerCase().includes(q))) &&
      (statusFilter === 'all' || e.status === statusFilter) &&
      (!hideBaseline || !e.isBaseline))
  }, [entries, search, statusFilter, hideBaseline])

  const exportRows = () => {
    const { exportToExcel } = require('@/lib/excelExport')
    exportToExcel({
      filename: 'pos_charges_history',
      sheetName: 'Charges History',
      columns: [
        { key: 'changedAt', label: 'Changed On', width: 20 },
        { key: 'machineName', label: 'Machine', width: 22 },
        { key: 'terminalId', label: 'Terminal', width: 16 },
        { key: 'brand', label: 'Brand', width: 14 },
        { key: 'effectiveFrom', label: 'Effective From', width: 16 },
        { key: 'commissionPercentage', label: 'Charges (%)', width: 12 },
        { key: 'bankCharges', label: 'Bank Charges (%)', width: 14 },
        { key: 'vatPercentage', label: 'VAT (%)', width: 10 },
        { key: 'status', label: 'Status', width: 12 },
        { key: 'changedBy', label: 'Changed By', width: 18 },
        { key: 'note', label: 'Note', width: 30 },
      ],
      data: rows.map((e) => ({
        ...e,
        changedAt: e.changedAt ? format(new Date(e.changedAt), 'dd-MMM-yyyy HH:mm') : '—',
        machineName: e.machineName || '—',
        effectiveFrom: fmtEff(e.effectiveFrom),
        commissionPercentage: pct(e.commissionPercentage),
        bankCharges: pct(e.bankCharges),
        vatPercentage: pct(e.vatPercentage),
        status: e.status.charAt(0).toUpperCase() + e.status.slice(1),
      })),
      title: 'POS Charges History',
      isRTL: false,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="form-label">Search</label>
          <input className="form-input" placeholder="Machine, terminal, brand, note, user…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Status</label>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="current">Current</option>
            <option value="scheduled">Scheduled (future)</option>
            <option value="past">Past</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-secondary inline-flex items-center gap-1" onClick={load} title="Refresh"><RefreshCw className="h-4 w-4" /></button>
          <button type="button" className="btn-secondary inline-flex items-center gap-1" onClick={exportRows} disabled={!rows.length}><Download className="h-4 w-4" />Export</button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <input type="checkbox" checked={hideBaseline} onChange={(e) => setHideBaseline(e.target.checked)} />
        Hide “Initial” rows (rates before date-wise history started)
      </label>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">No rate changes found.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700 max-h-[50dvh]">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left">Changed on</th>
                <th className="px-2 py-1.5 text-left">Machine</th>
                <th className="px-2 py-1.5 text-left">Effective from</th>
                <th className="px-2 py-1.5 text-right">Charges %</th>
                <th className="px-2 py-1.5 text-right">Bank %</th>
                <th className="px-2 py-1.5 text-right">VAT %</th>
                <th className="px-2 py-1.5 text-left">Status</th>
                <th className="px-2 py-1.5 text-left">By</th>
                <th className="px-2 py-1.5 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={`${e.machineId}-${e._id}`} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-2 py-1.5 whitespace-nowrap">{e.changedAt ? format(new Date(e.changedAt), 'dd-MMM-yyyy HH:mm') : '—'}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{e.machineName || '—'} <span className="text-gray-400">({e.terminalId})</span></td>
                  <td className="px-2 py-1.5 whitespace-nowrap font-medium">{fmtEff(e.effectiveFrom)}</td>
                  <td className="px-2 py-1.5 text-right">{pct(e.commissionPercentage)}</td>
                  <td className="px-2 py-1.5 text-right">{pct(e.bankCharges)}</td>
                  <td className="px-2 py-1.5 text-right">{pct(e.vatPercentage)}</td>
                  <td className="px-2 py-1.5"><span className={`px-2 py-0.5 rounded-full text-[11px] ${statusBadge[e.status]}`}>{e.status}</span></td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{e.changedBy}</td>
                  <td className="px-2 py-1.5 text-gray-500">{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {withoutHistory.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {withoutHistory.length} machine(s) have no history yet — run the one-time setup in Safety &amp; Setup.
        </p>
      )}
    </div>
  )
}

// ─── One-time migration, step by step ───────────────────────────────────────
function MigrationTab({ status, statusLoading, reloadStatus, onDone }: {
  status: MigrationStatus | null
  statusLoading: boolean
  reloadStatus: () => Promise<MigrationStatus | null>
  onDone: () => void
}) {
  const [backupDone, setBackupDone] = useState(false)
  const [dryResult, setDryResult] = useState<any | null>(null)
  const [runResult, setRunResult] = useState<any | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState<'' | 'dry' | 'run'>('')

  const call = async (dryRun: boolean) => {
    setBusy(dryRun ? 'dry' : 'run')
    try {
      const r = await fetchWithAuth(`/api/migrate/pos-charge-history${dryRun ? '?dryRun=1' : ''}`, { method: 'POST' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.details || data.error || 'Migration failed')
      if (dryRun) { setDryResult(data); toast.success('Dry run finished — nothing was changed') }
      else {
        setRunResult(data)
        toast.success('Migration completed')
        await reloadStatus()
        onDone()
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy('')
      setConfirming(false)
    }
  }

  const Step = ({ n, title, done, children }: { n: number; title: string; done?: boolean; children: any }) => (
    <div className="flex gap-3">
      <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </div>
      <div className="flex-1 pb-5 border-b border-gray-100 dark:border-gray-700 last:border-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">{title}</p>
        {children}
      </div>
    </div>
  )

  const Stat = ({ label, value, warn }: { label: string; value: any; warn?: boolean }) => (
    <div className="rounded border border-gray-200 dark:border-gray-700 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-lg font-semibold ${warn ? 'text-amber-600' : 'text-gray-900 dark:text-white'}`}>{value ?? '—'}</div>
    </div>
  )

  if (status?.migrated && !runResult) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700 p-4 flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div className="text-sm text-green-800 dark:text-green-200">
            Setup is complete. All {status.machinesTotal} machines have rate history and all {status.receiptsFrozen} receipts are locked to their rates.
            You can safely use <b>Monthly Update</b> now.
            {status.receiptsOrphaned > 0 && <span className="block text-xs mt-1">{status.receiptsOrphaned} receipt(s) belong to deleted machines and are left as they are.</span>}
          </div>
        </div>
        <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={reloadStatus} disabled={statusLoading}>
          <RefreshCw className="h-4 w-4" /> Re-check
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Run this once. It saves each machine's current rates as its starting history and locks those rates onto every existing receipt.
        No amount (paid, settled or due) is changed, and every screen shows the same numbers as before. It is safe to run again — finished items are skipped.
      </p>

      <Step n={1} title="Take a database backup" done={backupDone}>
        <p className="text-xs text-gray-500 mb-2">Export or snapshot your MongoDB database (Atlas → Backup, or mongodump) before continuing.</p>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={backupDone} onChange={(e) => setBackupDone(e.target.checked)} />
          I have taken a backup
        </label>
      </Step>

      <Step n={2} title="Check current status" done={!!status}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <Stat label="Machines" value={status?.machinesTotal} />
          <Stat label="Machines pending" value={status?.machinesPending} warn={!!status?.machinesPending} />
          <Stat label="Receipts" value={status?.receiptsLinked} />
          <Stat label="Receipts pending" value={status?.receiptsPending} warn={!!status?.receiptsPending} />
        </div>
        <button type="button" className="btn-secondary text-xs inline-flex items-center gap-1" onClick={reloadStatus} disabled={statusLoading}>
          <RefreshCw className={`h-3.5 w-3.5 ${statusLoading ? 'animate-spin' : ''}`} /> Refresh status
        </button>
      </Step>

      <Step n={3} title="Dry run (changes nothing)" done={!!dryResult}>
        <p className="text-xs text-gray-500 mb-2">Shows exactly what the migration would do without writing anything.</p>
        <button type="button" className="btn-secondary inline-flex items-center gap-2" disabled={!backupDone || !!busy} onClick={() => call(true)}>
          {busy === 'dry' ? 'Running dry run…' : 'Run dry run'}
        </button>
        {dryResult && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Stat label="Machines to set up" value={dryResult.machinesSeeded} />
            <Stat label="Receipts to lock" value={dryResult.transactionsFrozen} />
            <Stat label="Skipped (machine deleted)" value={dryResult.transactionsSkippedMachineDeleted} warn={!!dryResult.transactionsSkippedMachineDeleted} />
          </div>
        )}
      </Step>

      <Step n={4} title="Run migration" done={!!runResult}>
        <p className="text-xs text-gray-500 mb-2">Writes the history and locks rates on receipts. Amounts are not changed.</p>
        {!confirming ? (
          <button type="button" className="dubai-button disabled:opacity-50" disabled={!backupDone || !dryResult || !!busy || !!runResult} onClick={() => setConfirming(true)}>
            Run migration
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-amber-700 dark:text-amber-300">
              Set up {dryResult?.machinesSeeded} machine(s) and lock {dryResult?.transactionsFrozen} receipt(s)?
            </span>
            <button type="button" className="dubai-button" disabled={!!busy} onClick={() => call(false)}>
              {busy === 'run' ? 'Running…' : 'Yes, run now'}
            </button>
            <button type="button" className="btn-secondary" disabled={!!busy} onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        )}
        {runResult && (
          <p className="mt-2 text-xs text-green-700 dark:text-green-300">
            Done: {runResult.machinesSeeded} machine(s) set up, {runResult.transactionsFrozen} receipt(s) locked.
          </p>
        )}
      </Step>

      <Step n={5} title="Verify" done={!!runResult && !!status?.migrated}>
        <p className="text-xs text-gray-500">
          After running, status should show 0 pending. Open Reports / Dashboard and check a few totals are unchanged.
          Then use <b>Monthly Update</b> to enter the new rates with their effective date.
        </p>
      </Step>
    </div>
  )
}
