import { useMemo, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { TrendChart } from './TrendChart'
import { formatPace } from '../lib/geo'
import type { Report } from '../lib/reports'
import {
  PERIOD_LABEL,
  PERIOD_NOW,
  PERIOD_PREV,
  allSnapshots,
  formatDelta,
  formatRecapPace,
  trendDelta,
  trendSeries,
  type RecapPeriod,
} from '../lib/recap'

const KINDS: RecapPeriod[] = ['hari', 'minggu', 'bulan', 'tahun']

export function RecapGlance({ reports, onOpen }: { reports: Report[]; onOpen: () => void }) {
  const snaps = allSnapshots(reports)
  return (
    <div className="card">
      <h3>Rekap & tren</h3>
      <p className="meta" style={{ margin: '-0.35rem 0 0.75rem' }}>
        Form bersama: hari ini, minggu, bulan, tahun. Ketuk untuk grafik tren.
      </p>
      <div className="rekap-grid">
        {KINDS.map((kind) => {
          const s = snaps[kind]
          return (
            <button key={kind} type="button" className="rekap-tile" onClick={onOpen}>
              <span>{PERIOD_NOW[kind]}</span>
              <strong>{s.km.toFixed(1)}</strong>
              <em>
                {s.deltaPct != null ? `${formatDelta(s.deltaPct)} vs ${PERIOD_PREV[kind]}` : `${s.sessions} sesi`}
              </em>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Delta({ pct, vs }: { pct: number | null; vs: string }) {
  if (pct == null) {
    return <span className="delta flat">Belum ada pembanding {vs}</span>
  }
  const up = pct > 1
  const down = pct < -1
  return (
    <span className={up ? 'delta up' : down ? 'delta down' : 'delta flat'}>
      {up && <TrendingUp size={12} />}
      {down && <TrendingDown size={12} />}
      {formatDelta(pct)} vs {vs}
    </span>
  )
}

export function RecapView({ reports }: { reports: Report[] }) {
  const [period, setPeriod] = useState<RecapPeriod>('minggu')
  const now = useMemo(() => new Date(), [reports])
  const snaps = useMemo(() => allSnapshots(reports, now), [reports, now])
  const current = snaps[period]
  const series = useMemo(() => trendSeries(reports, period, now), [reports, period, now])

  return (
    <div className="rekap">
      <div className="card">
        <h3>Rekap form (bersama)</h3>
        <p className="meta" style={{ margin: '-0.35rem 0 0.75rem' }}>
          Dari Google Form, tanpa dobel tanggal+sesi yang sama. GPS HP tidak dihitung di sini.
        </p>
        <div className="rekap-grid">
          {KINDS.map((kind) => {
            const s = snaps[kind]
            return (
              <button
                key={kind}
                type="button"
                className={period === kind ? 'rekap-tile on' : 'rekap-tile'}
                onClick={() => setPeriod(kind)}
              >
                <span>{PERIOD_NOW[kind]}</span>
                <strong>{s.km.toFixed(1)}</strong>
                <em>km · {s.sessions} sesi</em>
              </button>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: '0.7rem' }}>
        <div className="tabs">
          {KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className={period === kind ? 'on' : undefined}
              onClick={() => setPeriod(kind)}
            >
              {PERIOD_LABEL[kind]}
            </button>
          ))}
        </div>

        <div className="rekap-hero">
          <p>{PERIOD_NOW[period]}</p>
          <strong>
            {current.km.toFixed(1)} <span>km</span>
          </strong>
          <div>
            <Delta pct={current.deltaPct} vs={PERIOD_PREV[period]} />
          </div>
          <p className="meta">
            {current.sessions} sesi
            {current.done ? ` · ${current.done} tercapai` : ''}
            {current.paceMin != null ? ` · pace ${formatRecapPace(current.paceMin)}` : ''}
          </p>
        </div>

        <div className="chart-box">
          <TrendChart labels={series.map((b) => b.label)} values={series.map((b) => b.km)} />
        </div>
        <p className="meta" style={{ marginTop: '0.45rem' }}>
          Tren jarak (km) · {PERIOD_LABEL[period].toLowerCase()}
        </p>
      </div>

      <div className="card" style={{ marginTop: '0.7rem' }}>
        <h3>Record {PERIOD_LABEL[period].toLowerCase()}</h3>
        {series.every((b) => b.sessions === 0) ? (
          <p className="empty-note">Belum ada laporan di rentang ini. Isi Google Form dulu.</p>
        ) : (
          <ul className="history">
            {[...series].reverse().map((b, i, arr) => {
              const prev = arr[i + 1]
              const pct = trendDelta(b, prev)
              return (
                <li key={b.key}>
                  <div>
                    <strong>{b.label}</strong>
                    <em>
                      {b.sessions} sesi
                      {b.paceMin != null ? ` · ${formatPace(b.paceMin)}/km` : ''}
                      {pct != null ? ` · ${formatDelta(pct)}` : ''}
                    </em>
                  </div>
                  <div className="km">
                    {b.km.toFixed(1)}
                    <small>KM</small>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
