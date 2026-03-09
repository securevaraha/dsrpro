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

export default function Chart({ type, data, options = {}, className = '' }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const loadChart = async () => {
      const { Chart: ChartJS, registerables } = await import('chart.js')
      ChartJS.register(...registerables)

      if (chartRef.current) {
        chartRef.current.destroy()
      }

      const ctx = canvasRef.current!.getContext('2d')!
      chartRef.current = new ChartJS(ctx, {
        type,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: 'rgb(107, 114, 128)'
              }
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
      }
    }
  }, [type, data, options])

  return <canvas ref={canvasRef} className={className} />
}