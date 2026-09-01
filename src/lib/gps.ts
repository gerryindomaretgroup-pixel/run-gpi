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

/** Oval sekitar GBK — untuk desktop/Codespaces yang tidak punya GPS. */
const DEMO: [number, number][] = [
  [-6.2184, 106.8028],
  [-6.2189, 106.8036],
  [-6.2196, 106.8040],
  [-6.2203, 106.8036],
  [-6.2208, 106.8028],
  [-6.2203, 106.8020],
  [-6.2196, 106.8016],
  [-6.2189, 106.8020],
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function startSimulatedGps(onPoint: (p: GpsPoint) => void) {
  let step = 0
  const tick = () => {
    const i = Math.floor(step / 3)
    const t = (step % 3) / 3
    const a = DEMO[i % DEMO.length]
    const b = DEMO[(i + 1) % DEMO.length]
    onPoint({
      lat: lerp(a[0], b[0], t),
      lng: lerp(a[1], b[1], t),
      at: Date.now(),
      accuracy: 8,
    })
    step += 1
  }
  tick()
  const id = window.setInterval(tick, 400)
  return () => window.clearInterval(id)
}

export function shouldKeepPoint(prev: GpsPoint | undefined, next: GpsPoint) {
  if (!prev) return true
  return haversineKm(prev, next) >= MIN_STEP_KM
}
