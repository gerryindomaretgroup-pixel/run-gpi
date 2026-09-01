import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ClipboardPen,
  Flame,
  Footprints,
  Home,
  Navigation,
  RefreshCw,
  Target,
  User,
} from 'lucide-react'
import { GpsTrack } from './components/GpsTrack'
import { DistanceChart } from './components/DistanceChart'
import {
  formatDay,
  greeting,
  isCurrentWeek,
  isSameDay,
  parsePlanCsv,
  type Plan,
  type Session,
} from './lib/plan'
import {
  formatDistance,
  mergePlanWithReports,
  parseKm,
  parseReportsCsv,
  type Report,
} from './lib/reports'
import { shortStatus, statusClass } from './lib/status'
import {
  formatDuration,
  formatPace,
  paceMinPerKm,
} from './lib/geo'
import { loadGpsRuns, saveGpsRuns, type GpsRun } from './lib/gpsStorage'
import {
  FORM_EMBED_URL,
  FORM_SHORT_URL,
  PLAN_SHEET_ID,
  REPORT_SHEET_ID,
  sheetCsvUrl,
} from './sources'

type View = 'home' | 'jadwal' | 'input'

async function fetchCsv(id: string) {
  const res = await fetch(`${sheetCsvUrl(id)}&_=${Date.now()}`)
  if (!res.ok) throw new Error(`Gagal baca sheet (${res.status})`)
  const csv = await res.text()
  if (csv.trimStart().startsWith('<')) {
    throw new Error('Sheet tidak bisa dibaca. Pastikan share “siapa saja yang punya link”.')
  }
  return csv
}

function SessionRow({ s }: { s: Session }) {
  return (
    <div className={isSameDay(s.date, new Date()) ? 'session today' : 'session'}>
      <div>
        <strong>{s.label}</strong>
        <em>{formatDay(s.date)}</em>
        <p>{s.plan}</p>
        {s.report && (
          <p className="meta">
            {[
              formatDistance(s.report.distance),
              s.report.pace && `pace ${s.report.pace}`,
              s.report.hr && `HR ${s.report.hr}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
      <span className={`st ${statusClass(s.status)}`}>{shortStatus(s.status)}</span>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [unmatched, setUnmatched] = useState<Report[]>([])
  const [gpsRuns, setGpsRuns] = useState<GpsRun[]>(() => loadGpsRuns())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [planCsv, reportCsv] = await Promise.all([
        fetchCsv(PLAN_SHEET_ID),
        fetchCsv(REPORT_SHEET_ID),
      ])
      const parsedReports = parseReportsCsv(reportCsv)
      const merged = mergePlanWithReports(parsePlanCsv(planCsv), parsedReports)
      setPlan(merged.plan)
      setReports(parsedReports)
      setUnmatched(merged.unmatched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat spreadsheet.')
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const current = plan?.weeks.find((w) => isCurrentWeek(w))
  const totalKm = useMemo(
    () => reports.reduce((n, r) => n + parseKm(r.distance), 0),
    [reports],
  )
  const gpsKm = useMemo(
    () => gpsRuns.reduce((n, r) => n + r.distanceKm, 0),
    [gpsRuns],
  )

  function persistGps(next: GpsRun[]) {
    setGpsRuns(next)
    saveGpsRuns(next)
  }

  return (
    <div className="shell">
      <header className="head">
        <div>
          <p>{greeting()},</p>
          <h1>
            Pelari Hebat <Flame size={22} />
          </h1>
        </div>
        <div className="avatar">
          <User size={22} />
        </div>
      </header>

      {loading && <p className="hint">Mengambil jadwal & laporan…</p>}
      {error && <p className="err">{error}</p>}

      {view === 'home' && plan && (
        <>
          <section className="pad">
            <div className="hero">
              <h2>Jarak tercatat</h2>
              <div className="big">
                <strong>{(totalKm + gpsKm).toFixed(1)}</strong>
                <span>KM</span>
              </div>
              <div className="split">
                <article>
                  <span>Form</span>
                  <strong>{totalKm.toFixed(1)} km</strong>
                </article>
                <div className="rule" />
                <article>
                  <span>GPS</span>
                  <strong>{gpsKm.toFixed(1)} km</strong>
                </article>
                <div className="rule" />
                <article>
                  <span>Minggu</span>
                  <strong>{current ? current.number : '—'}</strong>
                </article>
              </div>
            </div>
          </section>

          <section className="pad">
            <div className="card">
              <h3>
                <Navigation size={16} /> Rekam GPS (terpisah dari form)
              </h3>
              <GpsTrack
                onSave={(run) => persistGps([run, ...gpsRuns])}
              />
            </div>
          </section>

          <section className="pad">
            <div className="card">
              <a className="btn accent" href={FORM_SHORT_URL} target="_blank" rel="noreferrer">
                <ClipboardPen size={16} /> Isi laporan (Google Form)
              </a>
              <div className="row">
                <button type="button" className="btn ghost" onClick={() => void load()}>
                  <RefreshCw size={14} /> Muat ulang form
                </button>
                <button type="button" className="btn ghost" onClick={() => setView('input')}>
                  Form di sini
                </button>
              </div>
              <p className="meta" style={{ marginTop: '0.7rem' }}>
                Kosongkan jawaban form: buka form sebagai pemilik → Responses → hapus semua
                tanggapan. Saya tidak bisa menghapusnya dari sini.
              </p>
            </div>
          </section>

          <section className="pad">
            <div className="card">
              <h3>
                <Target size={16} /> Pacuan minggu {current?.number ?? '—'} · {current?.phase}
              </h3>
              {current ? current.sessions.map((s) => <SessionRow key={s.key} s={s} />) : (
                <p className="empty-note">Di luar rentang 16 minggu.</p>
              )}
            </div>
          </section>

          {unmatched.length > 0 && (
            <section className="pad">
              <div className="card">
                <h3>Di luar jadwal FM</h3>
                <ul className="history">
                  {unmatched.map((r, i) => (
                    <li key={`${r.at?.getTime() ?? i}-${r.sessionLabel}`}>
                      <div>
                        <strong>{r.sessionLabel}</strong>
                        <em>{formatDay(r.date)}</em>
                      </div>
                      <div className="km">
                        {formatDistance(r.distance) || '—'}
                        <small>{shortStatus(r.status)}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className="pad">
            <div className="card">
              <h3>Grafik performa</h3>
              <div className="chart-box">
                <DistanceChart reports={reports} />
              </div>
            </div>
          </section>

          <section className="pad">
            <div className="card">
              <h3>
                <Navigation size={16} /> Riwayat GPS
              </h3>
              {gpsRuns.length === 0 ? (
                <p className="empty-note">Belum ada sesi GPS di perangkat ini.</p>
              ) : (
                <ul className="history">
                  {gpsRuns.map((r) => (
                    <li key={r.id}>
                      <div className="left">
                        <div className="icon-bub">
                          <Navigation size={16} />
                        </div>
                        <div>
                          <strong>{r.source === 'simulasi' ? 'Simulasi' : 'GPS'}</strong>
                          <em>
                            {formatDay(new Date(r.startedAt))} · {formatDuration(r.durationMs)} ·{' '}
                            {formatPace(paceMinPerKm(r.distanceKm, r.durationMs))}/km
                          </em>
                        </div>
                      </div>
                      <div className="km">
                        {r.distanceKm.toFixed(2)}
                        <small>KM</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="pad">
            <div className="card">
              <h3>
                <Footprints size={16} /> Riwayat form
              </h3>
              {reports.length === 0 ? (
                <p className="empty-note">Belum ada laporan. Isi Google Form dulu.</p>
              ) : (
                <ul className="history">
                  {reports.map((r, i) => (
                    <li key={`${r.at?.getTime() ?? i}-${r.sessionLabel}`}>
                      <div className="left">
                        <div className="icon-bub">
                          <Footprints size={16} />
                        </div>
                        <div>
                          <strong>{r.sessionLabel || 'Sesi'}</strong>
                          <em>{formatDay(r.date)}</em>
                        </div>
                      </div>
                      <div className="km">
                        {parseKm(r.distance).toFixed(1)}
                        <small>KM</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      {view === 'jadwal' && plan && (
        <section className="pad">
          <div className="weeks">
            {plan.weeks.map((week) => (
              <article key={week.number} className={isCurrentWeek(week) ? 'week now' : 'week'}>
                <header>
                  <h3>
                    Minggu {week.number}
                    <small>{week.phase}</small>
                  </h3>
                  <span>{week.totalKm} km</span>
                </header>
                {week.sessions.map((s) => (
                  <SessionRow key={s.key} s={s} />
                ))}
              </article>
            ))}
          </div>
        </section>
      )}

      {view === 'input' && (
        <section className="pad input-view">
          <p>
            Form TARGET GPI menulis ke sheet jawaban otomatis. Setelah kirim, kembali ke Home lalu
            muat ulang.
          </p>
          <a className="btn accent" href={FORM_SHORT_URL} target="_blank" rel="noreferrer">
            Buka Google Form
          </a>
          <iframe title="TARGET GPI" src={FORM_EMBED_URL} />
        </section>
      )}

      <nav className="dock">
        <button type="button" className={view === 'home' ? 'on' : undefined} onClick={() => setView('home')}>
          <Home size={20} />
          <span>Home</span>
        </button>
        <button type="button" className={view === 'jadwal' ? 'on' : undefined} onClick={() => setView('jadwal')}>
          <CalendarDays size={20} />
          <span>Jadwal</span>
        </button>
        <button type="button" className={view === 'input' ? 'on' : undefined} onClick={() => setView('input')}>
          <ClipboardPen size={20} />
          <span>Form</span>
        </button>
      </nav>
    </div>
  )
}
