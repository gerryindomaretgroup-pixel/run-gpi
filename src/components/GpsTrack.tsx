import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Square } from 'lucide-react'
import { formatDuration, formatPace, paceMinPerKm, pathDistanceKm, type GpsPoint } from '../lib/geo'
import { shouldKeepPoint, watchRunGps } from '../lib/gps'
import type { GpsRun } from '../lib/gpsStorage'

export function GpsTrack({ onSave }: { onSave: (run: GpsRun) => void }) {
  const [active, setActive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [points, setPoints] = useState<GpsPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [pausedMs, setPausedMs] = useState(0)
  const pauseStarted = useRef<number | null>(null)
  const stopWatch = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!active || paused) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [active, paused])

  const liveMs = useMemo(() => {
    if (!startedAt) return elapsedMs
    if (paused) return elapsedMs
    return now - startedAt - pausedMs
  }, [startedAt, now, paused, elapsedMs, pausedMs])

  const distanceKm = useMemo(() => pathDistanceKm(points), [points])
  const last = points[points.length - 1] ?? null

  function clearWatch() {
    stopWatch.current?.()
    stopWatch.current = null
  }

  function attachWatch() {
    const onPoint = (p: GpsPoint) => {
      setPoints((prev) => (shouldKeepPoint(prev[prev.length - 1], p) ? [...prev, p] : prev))
    }
    stopWatch.current = watchRunGps(onPoint, (message) => {
      setError(`${message} Kalau GPS tidak aktif, isi laporan lewat Google Form.`)
    })
  }

  function start() {
    clearWatch()
    setError(null)
    setPoints([])
    setPaused(false)
    setPausedMs(0)
    pauseStarted.current = null
    setStartedAt(Date.now())
    setElapsedMs(0)
    setActive(true)
    attachWatch()
  }

  function togglePause() {
    if (!active) return
    if (!paused) {
      pauseStarted.current = Date.now()
      setElapsedMs(liveMs)
      setPaused(true)
      clearWatch()
    } else {
      if (pauseStarted.current) {
        setPausedMs((ms) => ms + (Date.now() - pauseStarted.current!))
      }
      pauseStarted.current = null
      setPaused(false)
      attachWatch()
    }
  }

  function stop() {
    clearWatch()
    const endedAt = Date.now()
    const duration = startedAt ? endedAt - startedAt - pausedMs : liveMs
    if (distanceKm >= 0.05) {
      onSave({
        id: crypto.randomUUID(),
        startedAt: startedAt ?? endedAt,
        endedAt,
        distanceKm,
        durationMs: duration,
        points,
        source: 'gps',
      })
    } else {
      setError('Jarak terlalu pendek untuk disimpan. Lanjut lari, atau isi lewat Google Form.')
    }
    setActive(false)
    setPaused(false)
    setStartedAt(null)
    setElapsedMs(0)
    setPausedMs(0)
    setPoints([])
  }

  useEffect(() => () => clearWatch(), [])

  return (
    <div className="gps">
      <div className="gps-status">
        <span>
          <i className={active ? (paused ? 'dot amber' : 'dot live') : 'dot'} />
          {active ? (paused ? 'Dijeda' : 'Merekam GPS') : 'Siap'}
        </span>
        <span>
          {last?.accuracy != null ? `Presisi ±${Math.round(last.accuracy)} m` : 'Presisi: —'}
        </span>
      </div>

      <div className="gps-metrics three">
        <div>
          <p>Jarak</p>
          <strong>
            {distanceKm.toFixed(2)} <span>KM</span>
          </strong>
        </div>
        <div>
          <p>Waktu</p>
          <strong>{formatDuration(liveMs)}</strong>
        </div>
        <div>
          <p>Pace</p>
          <strong>
            {formatPace(paceMinPerKm(distanceKm, liveMs))} <span>/km</span>
          </strong>
        </div>
      </div>

      {error && <p className="gps-alert">{error}</p>}

      <div className="gps-actions">
        {!active && (
          <button type="button" className="btn accent" onClick={start}>
            <Play size={16} /> Mulai lari
          </button>
        )}
        {active && (
          <>
            <button type="button" className="btn amber" onClick={togglePause}>
              <Pause size={16} /> {paused ? 'Lanjut' : 'Jeda'}
            </button>
            <button type="button" className="btn rose" onClick={stop}>
              <Square size={16} /> Simpan
            </button>
          </>
        )}
      </div>
      <p className="meta">
        Pakai HP di luar ruangan dan izinkan lokasi. GPS tersimpan di HP ini saja (bukan form).
        Lupa aktifkan GPS atau lari di laptop? Isi jarak & pace lewat Google Form.
      </p>
    </div>
  )
}
