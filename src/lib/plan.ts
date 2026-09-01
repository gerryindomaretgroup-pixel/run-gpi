import Papa from 'papaparse'

export type SessionKey = 'selasa' | 'rabu' | 'kamis' | 'sabtu' | 'minggu'

export type SessionReport = {
  distance: string
  pace: string
  hr: string
  note: string
}

export type Session = {
  key: SessionKey
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

const DAY_OFFSET: Record<SessionKey, number> = {
  selasa: 0,
  rabu: 1,
  kamis: 2,
  sabtu: 4,
  minggu: 5,
}

function parseUsDate(value: string): Date | null {
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const month = Number(m[1]) - 1
  const day = Number(m[2])
  const year = Number(m[3])
  const d = new Date(year, month, day)
  return Number.isNaN(d.getTime()) ? null : d
}

function addDays(base: Date | null, days: number): Date | null {
  if (!base) return null
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function session(
  key: SessionKey,
  label: string,
  plan: string,
  tuesday: Date | null,
  status: string,
): Session {
  return {
    key,
    label,
    plan: plan.trim(),
    date: addDays(tuesday, DAY_OFFSET[key]),
    status: status.trim(),
    report: null,
  }
}

export function parsePlanCsv(csv: string): Plan {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: false })
  const rows = parsed.data
  const title = (rows[0]?.[0] ?? 'Jadwal latihan').trim()
  const subtitle = (rows[1]?.[0] ?? '').trim()
  const weeks: Week[] = []
  let totalKm = ''

  for (const row of rows.slice(4)) {
    const weekNo = (row[0] ?? '').trim()
    if (!weekNo) continue
    if (weekNo.toLowerCase().startsWith('total')) {
      totalKm = (row[13] ?? '').trim()
      continue
    }
    const number = Number(weekNo)
    if (!Number.isFinite(number)) continue
    const tuesday = parseUsDate(row[3] ?? '')
    weeks.push({
      number,
      phase: (row[1] ?? '').trim(),
      totalKm: (row[13] ?? '').trim(),
      sessions: [
        session('selasa', 'Selasa · Easy', row[2] ?? '', tuesday, row[4] ?? ''),
        session('rabu', 'Rabu · Strength', row[5] ?? '', tuesday, row[6] ?? ''),
        session('kamis', 'Kamis · Tempo', row[7] ?? '', tuesday, row[8] ?? ''),
        session('sabtu', 'Sabtu · Long run', row[9] ?? '', tuesday, row[10] ?? ''),
        session('minggu', 'Minggu · Recovery', row[11] ?? '', tuesday, row[12] ?? ''),
      ],
    })
  }

  return { title, subtitle, weeks, totalKm }
}

export function isCurrentWeek(week: Week, now = new Date()): boolean {
  const start = week.sessions[0]?.date
  if (!start) return false
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
