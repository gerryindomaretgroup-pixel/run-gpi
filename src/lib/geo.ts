export type GpsPoint = {
  lat: number
  lng: number
  at: number
  accuracy: number | null
}

const R_KM = 6371

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

export function haversineKm(a: Pick<GpsPoint, 'lat' | 'lng'>, b: Pick<GpsPoint, 'lat' | 'lng'>) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)))
}

export function pathDistanceKm(points: GpsPoint[]) {
  let d = 0
  for (let i = 1; i < points.length; i++) d += haversineKm(points[i - 1], points[i])
  return d
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
}

export function formatPace(minPerKm: number) {
  if (!Number.isFinite(minPerKm) || minPerKm <= 0) return '—'
  const m = Math.floor(minPerKm)
  const s = Math.round((minPerKm - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function paceMinPerKm(distanceKm: number, durationMs: number) {
  if (distanceKm < 0.05 || durationMs <= 0) return 0
  return durationMs / 60000 / distanceKm
}
