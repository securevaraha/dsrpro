'use client'
import { useEffect, useRef } from 'react'

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string
    borderWidth?: number
  }[]
}

interface ChartProps {
  type: 'line' | 'bar' | 'doughnut'
  data: ChartData
  options?: any
  className?: string
}

const EMPTY_OPTIONS = {}
export default function Chart({ type, data, options = EMPTY_OPTIONS, className = '' }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const loadChart = async () => {
      const { Chart: ChartJS, registerables } = await import('chart.js')
      ChartJS.register(...registerables)

      if (chartRef.current) {
        chartRef.current.data = data
        chartRef.current.update('none')
        return
      }

      const ctx = canvasRef.current!.getContext('2d')!
      chartRef.current = new ChartJS(ctx, {
        type,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400 },
          plugins: {
            legend: {
              labels: { color: 'rgb(107, 114, 128)' }
            }
          },
          scales: type !== 'doughnut' ? {
            x: {
              ticks: { color: 'rgb(107, 114, 128)' },
              grid: { color: 'rgba(107, 114, 128, 0.1)' }
            },
            y: {
              ticks: { color: 'rgb(107, 114, 128)' },
              grid: { color: 'rgba(107, 114, 128, 0.1)' }
            }
          } : {},
          ...options
        }
      })
    }

    loadChart()

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [type])

  // Update data without destroying the chart
  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.data = data
    chartRef.current.update('none')
  }, [data])

  return <canvas ref={canvasRef} className={className} />
}