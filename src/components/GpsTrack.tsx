import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigation, Pause, Play, Square } from 'lucide-react'
import { formatDuration, formatPace, paceMinPerKm, pathDistanceKm, type GpsPoint } from '../lib/geo'
import { shouldKeepPoint, startSimulatedGps, watchRunGps } from '../lib/gps'
import type { GpsRun } from '../lib/gpsStorage'

export function GpsTrack({ onSave }: { onSave: (run: GpsRun) => void }) {
  const [active, setActive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [mode, setMode] = useState<'gps' | 'simulasi'>('gps')
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

  function start(nextMode: 'gps' | 'simulasi') {
    clearWatch()
    setMode(nextMode)
    setError(null)
    setPoints([])
    setPaused(false)
    setPausedMs(0)
    pauseStarted.current = null
    const t = Date.now()
    setStartedAt(t)
    setElapsedMs(0)
    setActive(true)
    const onPoint = (p: GpsPoint) => {
      setPoints((prev) => (shouldKeepPoint(prev[prev.length - 1], p) ? [...prev, p] : prev))
    }
    stopWatch.current =
      nextMode === 'simulasi' ? startSimulatedGps(onPoint) : watchRunGps(onPoint, setError)
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
      const onPoint = (p: GpsPoint) => {
        setPoints((prev) => (shouldKeepPoint(prev[prev.length - 1], p) ? [...prev, p] : prev))
      }
      stopWatch.current =
        mode === 'simulasi' ? startSimulatedGps(onPoint) : watchRunGps(onPoint, setError)
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
        source: mode,
      })
    } else {
      setError('Jarak terlalu pendek untuk disimpan. Lanjut dulu, atau pakai simulasi.')
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
      <div className="tabs">
        <button
          type="button"
          className={mode === 'gps' ? 'on' : undefined}
          onClick={() => !active && setMode('gps')}
        >
          <Navigation size={14} /> GPS HP
        </button>
        <button
          type="button"
          className={mode === 'simulasi' ? 'on' : undefined}
          onClick={() => !active && setMode('simulasi')}
        >
          Simulasi
        </button>
      </div>

      <div className="gps-status">
        <span>
          <i className={active ? (paused ? 'dot amber' : 'dot live') : 'dot'} />
          {active ? (paused ? 'Dijeda' : mode === 'simulasi' ? 'Simulasi rute GBK' : 'Merekam GPS') : 'Siap'}
        </span>
        <span>
          {last?.accuracy != null ? `Presisi ±${Math.round(last.accuracy)} m` : 'Presisi: —'}
        </span>
      </div>

      <div className="gps-metrics">
        <div>
          <p>Jarak live</p>
          <strong>
            {distanceKm.toFixed(2)} <span>KM</span>
          </strong>
        </div>
        <div>
          <p>Waktu</p>
          <strong>{formatDuration(liveMs)}</strong>
        </div>
      </div>
      <p className="meta gps-pace">Pace {formatPace(paceMinPerKm(distanceKm, liveMs))} /km</p>

      {error && <p className="gps-alert">{error}</p>}

      <div className="gps-actions">
        {!active && (
          <button type="button" className="btn accent" onClick={() => start(mode)}>
            <Play size={16} /> {mode === 'simulasi' ? 'Mulai simulasi' : 'Mulai lari'}
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
        GPS sungguhan: HP + izin lokasi (luar ruangan ±5–20 m). Codespaces/laptop: pakai Simulasi.
        Sesi GPS tersimpan di HP ini, terpisah dari Google Form.
      </p>
    </div>
  )
}
