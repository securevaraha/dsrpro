import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import POSMachine from '@/models/POSMachine'
import User from '@/models/User'
import { requireRole, isErrorResponse } from '@/lib/auth'
import { ratesFromPos, sortedHistory, toDayKey } from '@/lib/posCharges'

// Read-only audit log of every POS rate change, newest first.
//   GET /api/pos-machines/charge-history[?machineId=...]
export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin'])
    if (isErrorResponse(auth)) return auth
    await connectDB()

    const machineId = new URL(request.url).searchParams.get('machineId')
    const machines = await POSMachine.find(machineId ? { _id: machineId } : {})
      .select('machineName terminalId brand segment commissionPercentage bankCharges vatPercentage chargeHistory')
      .lean()

    const userIds = new Set<string>()
    for (const m of machines as any[]) {
      for (const h of m.chargeHistory || []) if (h.changedBy) userIds.add(String(h.changedBy))
    }
    const users = await User.find({ _id: { $in: [...userIds] } }).select('name').lean()
    const nameById = new Map((users as any[]).map((u) => [String(u._id), u.name]))

    const todayKey = toDayKey(new Date())
    const entries: any[] = []
    const machinesWithoutHistory: any[] = []

    for (const m of machines as any[]) {
      const hist = sortedHistory(m)
      const base = { machineId: m._id, machineName: m.machineName, terminalId: m.terminalId, brand: m.brand, segment: m.segment }
      if (hist.length === 0) {
        machinesWithoutHistory.push({ ...base, ...ratesFromPos(m) })
        continue
      }
      // The entry in force today (latest with effectiveFrom <= today).
      let currentIdx = 0
      hist.forEach((h, i) => { if (toDayKey(h.effectiveFrom) <= todayKey) currentIdx = i })
      hist.forEach((h: any, i) => {
        const key = toDayKey(h.effectiveFrom)
        entries.push({
          ...base,
          _id: h._id,
          ...ratesFromPos(h),
          effectiveFrom: h.effectiveFrom,
          isBaseline: key <= '2000-01-01',
          status: key > todayKey ? 'scheduled' : i === currentIdx ? 'current' : 'past',
          changedAt: h.changedAt,
          changedBy: h.changedBy ? nameById.get(String(h.changedBy)) || '—' : '—',
          note: h.note || '',
        })
      })
    }

    entries.sort((a, b) =>
      new Date(b.changedAt || 0).getTime() - new Date(a.changedAt || 0).getTime() ||
      toDayKey(b.effectiveFrom).localeCompare(toDayKey(a.effectiveFrom)))

    return NextResponse.json({ entries, machinesWithoutHistory })
  } catch (error: any) {
    console.error('charge-history error:', error)
    return NextResponse.json({ error: 'Failed to load charge history', details: error.message }, { status: 500 })
  }
}
