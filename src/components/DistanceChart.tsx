import { useEffect, useRef } from 'react'
import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { formatDay } from '../lib/plan'
import { parseKm, type Report } from '../lib/reports'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
)

export function DistanceChart({ reports }: { reports: Report[] }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const recent = [...reports].reverse().slice(-8)
    const labels = recent.map((r) => formatDay(r.date))
    const points = recent.map((r) => parseKm(r.distance))
    const gradient = ctx.createLinearGradient(0, 0, 0, 180)
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)')
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)')

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Belum ada data'],
        datasets: [
          {
            label: 'Jarak (km)',
            data: points.length ? points : [0],
            borderColor: '#10b981',
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointBackgroundColor: '#0f172a',
            pointBorderColor: '#10b981',
            pointBorderWidth: 2,
            pointRadius: 4,
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#fff',
            bodyColor: '#10b981',
            displayColors: false,
            callbacks: {
              label: (item) => `${item.parsed.y} km`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#334155' },
            ticks: { color: '#64748b', font: { size: 10 } },
          },
        },
      },
    })

    return () => chart.destroy()
  }, [reports])

  return <canvas ref={ref} />
}
