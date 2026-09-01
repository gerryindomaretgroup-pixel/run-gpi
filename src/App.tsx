import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  ClipboardPen,
  ExternalLink,
  Flame,
  Footprints,
  Home,
  Navigation,
  Pencil,
  RefreshCw,
  Target,
  TrendingUp,
  User,
} from 'lucide-react'
import { GpsTrack } from './components/GpsTrack'
import { RecapGlance, RecapView } from './components/RecapView'
import { HelpNotes } from './components/HelpNotes'
import {
  formatClock,
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
import { latestReports } from './lib/recap'
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
  PLAN_SHEET_URL,
  REPORT_SHEET_ID,
  sheetCsvUrl,
} from './sources'

type View = 'home' | 'jadwal' | 'rekap' | 'input'

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

function ReportLine({ r }: { r: Report }) {
  return (
    <li>
      <div className="left">
        <div className="icon-bub">
          <Footprints size={16} />
        </div>
        <div>
          <strong>{r.sessionLabel || 'Sesi'}</strong>
          <em>
            {formatDay(r.date)}
            {r.pace ? ` · pace ${r.pace}` : ''}
          </em>
        </div>
      </div>
      <div className="km">
        {parseKm(r.distance).toFixed(1)}
        <small>KM</small>
      </div>
    </li>
  )
}

function SheetBar({
  plan,
  syncedAt,
  loading,
  onReload,
}: {
  plan: Plan | null
  syncedAt: Date | null
  loading: boolean
  onReload: () => void
}) {
  return (
    <div className="card sheet-bar">
      <h3>
        <Pencil size={16} /> Jadwal dari spreadsheet
      </h3>
      {plan && (
        <>
          <p className="sheet-title">{plan.title}</p>
          {plan.subtitle && <p className="meta">{plan.subtitle}</p>}
        </>
      )}
      <p className="meta" style={{ marginTop: '0.55rem' }}>
        Ubah, tambah minggu, atau sesuaikan sesi langsung di Google Sheets. Dashboard mengikuti
        isi sheet terbaru (bukan disimpan di HP).
      </p>
      <div className="row">
        <a className="btn ghost" href={PLAN_SHEET_URL} target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> Ubah di Sheets
        </a>
        <button type="button" className="btn ghost" onClick={onReload} disabled={loading}>
          <RefreshCw size={14} /> {loading ? 'Mengambil…' : 'Muat ulang'}
        </button>
      </div>
      <p className="sync-line">
        {syncedAt
          ? `Terakhir diambil ${formatClock(syncedAt)} · ${plan?.weeks.length ?? 0} minggu`
          : 'Belum tersinkron'}
        . Kalau baru edit sheet, kembali ke tab ini atau ketuk Muat ulang.
      </p>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [unmatched, setUnmatched] = useState<Report[]>([])
  const [duplicates, setDuplicates] = useState<Report[]>([])
  const [gpsRuns, setGpsRuns] = useState<GpsRun[]>(() => loadGpsRuns())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)
  const hasPlan = useRef(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
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
      setDuplicates(merged.duplicates)
      setSyncedAt(new Date())
      hasPlan.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat spreadsheet.')
      if (!hasPlan.current) setPlan(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void load(true)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
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
  const recapReports = useMemo(() => latestReports(reports), [reports])

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
            <RecapGlance reports={recapReports} onOpen={() => setView('rekap')} />
          </section>

          <section className="pad">
            <div className="card">
              <h3>
                <Navigation size={16} /> Rekam GPS HP
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
                  <RefreshCw size={14} /> Muat ulang sheet
                </button>
                <button type="button" className="btn ghost" onClick={() => setView('input')}>
                  Form di sini
                </button>
              </div>
              <p className="meta" style={{ marginTop: '0.7rem' }}>
                Form bisa diisi banyak orang tanpa login — semua masuk ke satu sheet. GPS tidak
                terkirim. Lupa GPS? Isi form saja. Kosongkan jawaban: pemilik form → Responses →
                hapus tanggapan.
              </p>
            </div>
          </section>

          <section className="pad">
            <div className="card">
              <h3>
                <Target size={16} /> Pacuan minggu {current?.number ?? '—'} · {current?.phase}
              </h3>
              {current ? current.sessions.map((s) => <SessionRow key={s.key} s={s} />) : (
                <p className="empty-note">
                  Tidak ada minggu yang sedang berjalan. Cek tab Jadwal atau perbarui spreadsheet.
                </p>
              )}
            </div>
          </section>

          <section className="pad">
            <HelpNotes />
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

          {duplicates.length > 0 && (
            <section className="pad">
              <div className="card">
                <h3>Pengisian ganda</h3>
                <p className="meta" style={{ marginBottom: '0.6rem' }}>
                  Tanggal + sesi yang sama diisi lebih dari sekali. Jadwal memakai yang paling
                  baru; ini isi sebelumnya (banyak orang / isi ulang).
                </p>
                <ul className="history">
                  {duplicates.map((r, i) => (
                    <ReportLine key={`${r.at?.getTime() ?? i}-${r.sessionLabel}-dup`} r={r} />
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className="pad">
            <div className="card">
              <h3 id="riwayat-gps">
                <Navigation size={16} /> Riwayat GPS
              </h3>
              <p className="meta" style={{ margin: '-0.35rem 0 0.7rem' }}>
                Hanya di HP ini. Pace = waktu ÷ jarak. Bukan spreadsheet. Kalau GPS tidak dipakai,
                isi form.
              </p>
              {gpsRuns.length === 0 ? (
                <p className="empty-note">Belum ada sesi GPS di perangkat ini.</p>
              ) : (
                <ul className="history">
                  {gpsRuns.map((r) => {
                    const pace = formatPace(paceMinPerKm(r.distanceKm, r.durationMs))
                    return (
                      <li key={r.id}>
                        <div className="left">
                          <div className="icon-bub">
                            <Navigation size={16} />
                          </div>
                          <div>
                            <strong>GPS HP</strong>
                            <em>
                              {formatDay(new Date(r.startedAt))} · {formatDuration(r.durationMs)}
                            </em>
                          </div>
                        </div>
                        <div className="km">
                          {r.distanceKm.toFixed(2)}
                          <small>KM · {pace}/km</small>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          <section className="pad">
            <div className="card">
              <h3>
                <Footprints size={16} /> Riwayat form (semua orang)
              </h3>
              {reports.length === 0 ? (
                <p className="empty-note">Belum ada laporan. Isi Google Form dulu.</p>
              ) : (
                <ul className="history">
                  {reports.map((r, i) => (
                    <ReportLine key={`${r.at?.getTime() ?? i}-${r.sessionLabel}`} r={r} />
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      {view === 'jadwal' && (
        <section className="pad">
          <SheetBar
            plan={plan}
            syncedAt={syncedAt}
            loading={loading}
            onReload={() => void load()}
          />
          {plan ? (
            <div className="weeks" style={{ marginTop: '0.7rem' }}>
              {plan.weeks.map((week) => (
                <article key={week.number} className={isCurrentWeek(week) ? 'week now' : 'week'}>
                  <header>
                    <h3>
                      Minggu {week.number}
                      <small>{week.phase}</small>
                    </h3>
                    <span>{week.totalKm} km</span>
                  </header>
                  {week.sessions.map((s, i) => (
                    <SessionRow key={`${week.number}-${s.key}-${i}`} s={s} />
                  ))}
                </article>
              ))}
            </div>
          ) : (
            !loading && <p className="empty-note">Jadwal belum terbaca. Coba muat ulang.</p>
          )}
        </section>
      )}

      {view === 'rekap' && (
        <section className="pad">
          <RecapView reports={recapReports} />
        </section>
      )}

      {view === 'input' && (
        <section className="pad input-view">
          <p>
            Form TARGET GPI menulis ke sheet jawaban bersama. Tidak ada login — isi dari siapa pun
            tampil di dashboard yang sama. GPS opsional di HP; kalau tidak dipakai, form ini cukup.
            Setelah kirim, kembali ke Home lalu muat ulang sheet.
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
        <button type="button" className={view === 'rekap' ? 'on' : undefined} onClick={() => setView('rekap')}>
          <TrendingUp size={20} />
          <span>Rekap</span>
        </button>
        <button type="button" className={view === 'input' ? 'on' : undefined} onClick={() => setView('input')}>
          <ClipboardPen size={20} />
          <span>Form</span>
        </button>
      </nav>
    </div>
  )
}
