import Papa from 'papaparse'

export const WEEKDAYS = [
  'senin',
  'selasa',
  'rabu',
  'kamis',
  'jumat',
  'sabtu',
  'minggu',
] as const

export type SessionKey = (typeof WEEKDAYS)[number]

export type SessionReport = {
  distance: string
  pace: string
  hr: string
  note: string
}

export type Session = {
  key: SessionKey | 'lain'
  label: string
  plan: string
  date: Date | null
  status: string
  report: SessionReport | null
}

export type Week = {
  number: number
  phase: string
  totalKm: string
  sessions: Session[]
}

export type Plan = {
  title: string
  subtitle: string
  weeks: Week[]
  totalKm: string
}

const DOW: Record<SessionKey, number> = {
  senin: 0,
  selasa: 1,
  rabu: 2,
  kamis: 3,
  jumat: 4,
  sabtu: 5,
  minggu: 6,
}

type ColRole =
  | { type: 'week' }
  | { type: 'phase' }
  | { type: 'total' }
  | { type: 'skip' }
  | { type: 'session'; key: SessionKey | 'lain'; label: string }
  | { type: 'date'; sessionIndex: number }
  | { type: 'status'; sessionIndex: number }

export function parseSheetDate(value: string): Date | null {
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const a = Number(m[1])
  const b = Number(m[2])
  const year = Number(m[3])
  let month: number
  let day: number
  if (a > 12) {
    day = a
    month = b - 1
  } else if (b > 12) {
    month = a - 1
    day = b
  } else {
    // Google CSV dari sheet ini: M/D/YYYY (contoh 9/1/2026 = 1 Sep)
    month = a - 1
    day = b
  }
  const d = new Date(year, month, day)
  return Number.isNaN(d.getTime()) ? null : d
}

function addDays(base: Date | null, days: number): Date | null {
  if (!base) return null
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

export function weekdayFromText(value: string): SessionKey | 'lain' {
  const s = value.trim().toLowerCase()
  for (const day of WEEKDAYS) {
    if (s.startsWith(day) || s.includes(`${day} `) || s.includes(`${day}(`) || s.includes(`${day}·`)) {
      return day
    }
  }
  return 'lain'
}

function labelFromHeader(header: string) {
  const h = header.trim()
  const m = h.match(/^(.+?)\s*\((.+)\)\s*$/)
  if (m) return `${m[1].trim()} · ${m[2].trim()}`
  return h || 'Sesi'
}

function findHeaderRow(rows: string[][]) {
  const limit = Math.min(rows.length, 12)
  for (let i = 0; i < limit; i++) {
    const cells = rows[i].map((c) => (c ?? '').trim().toLowerCase())
    const hasWeek = cells.some((c) => c === 'minggu')
    const hasSession =
      cells.some((c) => c.includes('fase')) ||
      cells.some((c) => WEEKDAYS.some((d) => d !== 'minggu' && c.includes(d)))
    if (hasWeek && hasSession) return i
  }
  return 3
}

function classifyHeaders(headers: string[]): ColRole[] {
  const roles: ColRole[] = []
  let weekAssigned = false
  let sessionCount = 0

  for (const raw of headers) {
    const h = (raw ?? '').trim()
    const low = h.toLowerCase()

    if (!weekAssigned && low === 'minggu') {
      roles.push({ type: 'week' })
      weekAssigned = true
      continue
    }
    if (low.includes('fase')) {
      roles.push({ type: 'phase' })
      continue
    }
    if (low.includes('total')) {
      roles.push({ type: 'total' })
      continue
    }
    if (low.startsWith('tanggal') || low === 'tgl' || low === 'date') {
      roles.push({ type: 'date', sessionIndex: sessionCount - 1 })
      continue
    }
    if (low.startsWith('status')) {
      roles.push({ type: 'status', sessionIndex: sessionCount - 1 })
      continue
    }
    if (!h) {
      roles.push({ type: 'skip' })
      continue
    }

    sessionCount += 1
    roles.push({
      type: 'session',
      key: weekdayFromText(h),
      label: labelFromHeader(h),
    })
  }

  return roles
}

function fillMissingDates(sessions: Session[]) {
  const anchor = sessions.find((s) => s.date && s.key !== 'lain')
  if (!anchor?.date || anchor.key === 'lain') return
  for (const session of sessions) {
    if (session.date || session.key === 'lain') continue
    session.date = addDays(anchor.date, DOW[session.key] - DOW[anchor.key])
  }
}

function legacySessions(row: string[], tuesday: Date | null): Session[] {
  const make = (
    start: number,
    key: SessionKey,
    label: string,
    offsetFromTue: number,
  ): Session => ({
    key,
    label,
    plan: (row[start] ?? '').trim(),
    date: addDays(tuesday, offsetFromTue),
    status: (row[start + 1] ?? '').trim(),
    report: null,
  })
  return [
    make(2, 'selasa', 'Selasa · Easy', 0),
    make(5, 'rabu', 'Rabu · Strength', 1),
    make(7, 'kamis', 'Kamis · Tempo', 2),
    make(9, 'sabtu', 'Sabtu · Long run', 4),
    make(11, 'minggu', 'Minggu · Recovery', 5),
  ]
}

export function parsePlanCsv(csv: string): Plan {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: false })
  const rows = parsed.data
  const headerIndex = findHeaderRow(rows)
  const title = (rows[0]?.[0] ?? 'Jadwal latihan').trim()
  const subtitle = (rows[1]?.[0] ?? '').trim()
  const roles = classifyHeaders(rows[headerIndex] ?? [])
  const sessionRoles = roles.filter((r) => r.type === 'session')
  const weeks: Week[] = []
  let totalKm = ''

  for (const row of rows.slice(headerIndex + 1)) {
    const weekNo = (row[roles.findIndex((r) => r.type === 'week')] ?? row[0] ?? '').trim()
    if (!weekNo) continue
    if (weekNo.toLowerCase().startsWith('total')) {
      const totalRole = roles.findIndex((r) => r.type === 'total')
      totalKm = (row[totalRole >= 0 ? totalRole : 13] ?? '').trim()
      continue
    }
    const number = Number(weekNo)
    if (!Number.isFinite(number)) continue

    const phaseIdx = roles.findIndex((r) => r.type === 'phase')
    const totalIdx = roles.findIndex((r) => r.type === 'total')
    let sessions: Session[] = []

    if (sessionRoles.length > 0) {
      for (let i = 0; i < roles.length; i++) {
        const role = roles[i]
        if (role.type !== 'session') continue
        sessions.push({
          key: role.key,
          label: role.label,
          plan: (row[i] ?? '').trim(),
          date: null,
          status: '',
          report: null,
        })
      }
      for (let i = 0; i < roles.length; i++) {
        const role = roles[i]
        if (role.type === 'date' && role.sessionIndex >= 0) {
          const session = sessions[role.sessionIndex]
          if (session) session.date = parseSheetDate(row[i] ?? '')
        }
        if (role.type === 'status' && role.sessionIndex >= 0) {
          const session = sessions[role.sessionIndex]
          if (session) session.status = (row[i] ?? '').trim()
        }
      }
      fillMissingDates(sessions)
    } else {
      sessions = legacySessions(row, parseSheetDate(row[3] ?? ''))
    }

    weeks.push({
      number,
      phase: (row[phaseIdx >= 0 ? phaseIdx : 1] ?? '').trim(),
      totalKm: (row[totalIdx >= 0 ? totalIdx : 13] ?? '').trim(),
      sessions,
    })
  }

  return { title, subtitle, weeks, totalKm }
}

export function isCurrentWeek(week: Week, now = new Date()): boolean {
  const dates = week.sessions.map((s) => s.date).filter((d): d is Date => Boolean(d))
  if (!dates.length) return false
  const start = new Date(Math.min(...dates.map((d) => d.getTime())))
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return now >= start && now < end
}

export function formatDay(date: Date | null): string {
  if (!date) return '—'
  return date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatClock(date: Date | null): string {
  if (!date) return ''
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function isSameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function greeting(now = new Date()) {
  const h = now.getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}
