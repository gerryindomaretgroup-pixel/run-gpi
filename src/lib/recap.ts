import { formatPace } from './geo'
import { parseKm, type Report } from './reports'

export type RecapPeriod = 'hari' | 'minggu' | 'bulan' | 'tahun'

export type RecapTotals = {
  km: number
  sessions: number
  done: number
  paceMin: number | null
}

export type RecapBucket = RecapTotals & {
  key: string
  label: string
  from: Date
}

export type PeriodSnap = RecapTotals & {
  from: Date
  to: Date
  prev: RecapTotals
  deltaPct: number | null
}

const PERIODS: RecapPeriod[] = ['hari', 'minggu', 'bulan', 'tahun']

export function parsePaceMin(value: string) {
  const t = value.trim()
  const clock = t.match(/(\d+)\s*[:.]\s*(\d{1,2})/)
  if (clock) return Number(clock[1]) + Number(clock[2]) / 60
  const n = Number.parseFloat(t.replace(',', '.').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function latestReports(reports: Report[]) {
  const seen = new Set<string>()
  const out: Report[] = []
  for (const r of reports) {
    const day = r.date ? dayKey(r.date) : 'no-date'
    const key = `${day}|${r.sessionKey}|${r.sessionLabel}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfWeek(d: Date) {
  const s = startOfDay(d)
  const dow = s.getDay()
  s.setDate(s.getDate() + (dow === 0 ? -6 : 1 - dow))
  return s
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1)
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function periodStart(kind: RecapPeriod, d: Date) {
  if (kind === 'hari') return startOfDay(d)
  if (kind === 'minggu') return startOfWeek(d)
  if (kind === 'bulan') return startOfMonth(d)
  return startOfYear(d)
}

function nextPeriod(kind: RecapPeriod, from: Date) {
  if (kind === 'hari') return addDays(from, 1)
  if (kind === 'minggu') return addDays(from, 7)
  if (kind === 'bulan') return new Date(from.getFullYear(), from.getMonth() + 1, 1)
  return new Date(from.getFullYear() + 1, 0, 1)
}

function prevPeriod(kind: RecapPeriod, from: Date) {
  if (kind === 'hari') return addDays(from, -1)
  if (kind === 'minggu') return addDays(from, -7)
  if (kind === 'bulan') return new Date(from.getFullYear(), from.getMonth() - 1, 1)
  return new Date(from.getFullYear() - 1, 0, 1)
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isDone(status: string) {
  const s = status.toLowerCase()
  return Boolean(s) && s.includes('tercapai') && !s.includes('tidak')
}

function inRange(d: Date, from: Date, to: Date) {
  return d >= from && d < to
}

function sumReports(reports: Report[], from: Date, to: Date): RecapTotals {
  let km = 0
  let sessions = 0
  let done = 0
  let paceWeight = 0
  let paceKm = 0
  for (const r of reports) {
    if (!r.date || !inRange(r.date, from, to)) continue
    const dist = parseKm(r.distance)
    const pace = parsePaceMin(r.pace)
    sessions += 1
    km += dist
    if (isDone(r.status)) done += 1
    if (dist > 0 && pace > 0) {
      paceWeight += pace * dist
      paceKm += dist
    }
  }
  return {
    km,
    sessions,
    done,
    paceMin: paceKm > 0 ? paceWeight / paceKm : null,
  }
}

function labelFor(kind: RecapPeriod, from: Date, to: Date) {
  if (kind === 'hari') {
    return from.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  if (kind === 'minggu') {
    const end = addDays(to, -1)
    const a = from.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    const b = end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    return `${a} – ${b}`
  }
  if (kind === 'bulan') {
    return from.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  }
  return String(from.getFullYear())
}

export function snapshot(reports: Report[], kind: RecapPeriod, now = new Date()): PeriodSnap {
  const from = periodStart(kind, now)
  const to = nextPeriod(kind, from)
  const prevFrom = prevPeriod(kind, from)
  const cur = sumReports(reports, from, to)
  const prev = sumReports(reports, prevFrom, from)
  return {
    ...cur,
    from,
    to,
    prev,
    deltaPct: prev.km > 0 ? ((cur.km - prev.km) / prev.km) * 100 : null,
  }
}

export function allSnapshots(reports: Report[], now = new Date()) {
  return Object.fromEntries(PERIODS.map((kind) => [kind, snapshot(reports, kind, now)])) as Record<
    RecapPeriod,
    PeriodSnap
  >
}

const SERIES_COUNT: Record<RecapPeriod, number> = {
  hari: 14,
  minggu: 8,
  bulan: 12,
  tahun: 4,
}

export function trendSeries(reports: Report[], kind: RecapPeriod, now = new Date()): RecapBucket[] {
  const count = SERIES_COUNT[kind]
  const current = periodStart(kind, now)
  let cursor = current
  for (let i = 1; i < count; i++) cursor = prevPeriod(kind, cursor)
  const buckets: RecapBucket[] = []
  for (let i = 0; i < count; i++) {
    const from = cursor
    const to = nextPeriod(kind, from)
    buckets.push({
      key: dayKey(from),
      label: labelFor(kind, from, to),
      from,
      ...sumReports(reports, from, to),
    })
    cursor = to
  }
  return buckets
}

export function trendDelta(current: RecapTotals, previous: RecapTotals | undefined) {
  if (!previous || previous.km <= 0) return null
  return ((current.km - previous.km) / previous.km) * 100
}

export function formatDelta(pct: number | null) {
  if (pct == null) return '—'
  const n = Math.round(pct)
  if (n === 0) return '0%'
  return `${n > 0 ? '+' : ''}${n}%`
}

export function formatRecapPace(min: number | null) {
  return min == null ? '—' : `${formatPace(min)}/km`
}

export const PERIOD_LABEL: Record<RecapPeriod, string> = {
  hari: 'Harian',
  minggu: 'Mingguan',
  bulan: 'Bulanan',
  tahun: 'Tahunan',
}

export const PERIOD_NOW: Record<RecapPeriod, string> = {
  hari: 'Hari ini',
  minggu: 'Minggu ini',
  bulan: 'Bulan ini',
  tahun: 'Tahun ini',
}

export const PERIOD_PREV: Record<RecapPeriod, string> = {
  hari: 'kemarin',
  minggu: 'minggu lalu',
  bulan: 'bulan lalu',
  tahun: 'tahun lalu',
}
