import Papa from 'papaparse'
import type { Plan, SessionKey } from './plan'

export type Report = {
  at: Date | null
  date: Date | null
  sessionLabel: string
  sessionKey: SessionKey | 'lain'
  status: string
  distance: string
  pace: string
  hr: string
  note: string
}

function pick(row: Record<string, string>, ...needles: string[]) {
  const entries = Object.entries(row)
  for (const needle of needles) {
    const found = entries.find(([k]) => k.toLowerCase().includes(needle.toLowerCase()))
    if (found?.[1]) return found[1].trim()
  }
  return ''
}

function parseEuDate(value: string): Date | null {
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2]) - 1
  const year = Number(m[3])
  const hour = Number(m[4] ?? 0)
  const minute = Number(m[5] ?? 0)
  const second = Number(m[6] ?? 0)
  const d = new Date(year, month, day, hour, minute, second)
  return Number.isNaN(d.getTime()) ? null : d
}

function sessionKeyFromLabel(label: string): SessionKey | 'lain' {
  const s = label.toLowerCase()
  if (s.startsWith('selasa')) return 'selasa'
  if (s.startsWith('rabu')) return 'rabu'
  if (s.startsWith('kamis')) return 'kamis'
  if (s.startsWith('sabtu')) return 'sabtu'
  if (s.startsWith('minggu')) return 'minggu'
  return 'lain'
}

function sameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function parseReportsCsv(csv: string): Report[] {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  return parsed.data
    .map((row) => {
      const sessionLabel = pick(row, 'sesi', 'hari')
      return {
        at: parseEuDate(pick(row, 'timestamp')),
        date: parseEuDate(pick(row, 'tanggal')),
        sessionLabel,
        sessionKey: sessionKeyFromLabel(sessionLabel),
        status: pick(row, 'status'),
        distance: pick(row, 'jarak'),
        pace: pick(row, 'pace'),
        hr: pick(row, 'hr'),
        note: pick(row, 'kendala', 'catatan'),
      }
    })
    .filter((r) => r.date || r.sessionLabel || r.status)
    .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0))
}

export function formatDistance(value: string) {
  const t = value.trim()
  if (!t) return ''
  if (/km|\bk\b/i.test(t)) return t
  return `${t} km`
}

export function parseKm(value: string) {
  const n = Number.parseFloat(value.replace(',', '.').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function mergePlanWithReports(plan: Plan, reports: Report[]) {
  const unmatched: Report[] = []
  const weeks = plan.weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => ({ ...session })),
  }))

  for (const report of reports) {
    if (report.sessionKey === 'lain') {
      unmatched.push(report)
      continue
    }
    let hit = false
    for (const week of weeks) {
      const session = week.sessions.find(
        (s) => s.key === report.sessionKey && sameDay(s.date, report.date),
      )
      if (!session) continue
      hit = true
      if (!session.report) {
        session.status = report.status
        session.report = {
          distance: report.distance,
          pace: report.pace,
          hr: report.hr,
          note: report.note,
        }
      }
      break
    }
    if (!hit) unmatched.push(report)
  }

  return {
    plan: { ...plan, weeks },
    unmatched,
    matchedCount: reports.length - unmatched.length,
  }
}
