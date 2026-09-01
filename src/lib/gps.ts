import { haversineKm, type GpsPoint } from './geo'

const MAX_ACCURACY_M = 40
const MIN_STEP_KM = 0.004

export function watchRunGps(
  onPoint: (p: GpsPoint) => void,
  onError: (message: string) => void,
) {
  if (!('geolocation' in navigator)) {
    onError('Browser ini tidak mendukung GPS.')
    return () => {}
  }

  const id = navigator.geolocation.watchPosition(
    (pos) => {
      if (pos.coords.accuracy > MAX_ACCURACY_M) return
      onPoint({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        at: pos.timestamp,
        accuracy: pos.coords.accuracy,
      })
    },
    (err) => {
      if (err.code === 1) onError('Izin lokasi ditolak. Izinkan GPS di browser HP.')
      else if (err.code === 2) onError('Sinyal GPS tidak ketemu. Coba di luar ruangan.')
      else onError('Gagal membaca GPS.')
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
  )

  return () => navigator.geolocation.clearWatch(id)
}

export function shouldKeepPoint(prev: GpsPoint | undefined, next: GpsPoint) {
  if (!prev) return true
  return haversineKm(prev, next) >= MIN_STEP_KM
}
