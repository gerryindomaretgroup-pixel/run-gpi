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

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
)

export function TrendChart({ labels, values }: { labels: string[]; values: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

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
            data: values.length ? values : [0],
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
              label: (item) => `${Number(item.parsed.y).toFixed(1)} km`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0, autoSkip: true },
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
  }, [labels, values])

  return <canvas ref={ref} />
}
