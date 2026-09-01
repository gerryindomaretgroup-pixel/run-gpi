import type { GpsPoint } from './geo'

export type GpsRun = {
  id: string
  startedAt: number
  endedAt: number
  distanceKm: number
  durationMs: number
  points: GpsPoint[]
  source: 'gps' | 'simulasi'
}

const KEY = 'run-gps-sessions-v1'

export function loadGpsRuns(): GpsRun[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GpsRun[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r) => r.source !== 'simulasi')
  } catch {
    return []
  }
}

export function saveGpsRuns(runs: GpsRun[]) {
  localStorage.setItem(KEY, JSON.stringify(runs))
}
