import { useEffect, useRef } from 'react'
import { loadChartJs } from '../utils/chartLoader'

export default function ChartCanvas({ config }: { config: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    loadChartJs().then((Chart) => {
      if (cancelled || !canvasRef.current) return
      chartRef.current?.destroy()
      chartRef.current = new Chart(canvasRef.current, config)
    })
    return () => {
      cancelled = true
      chartRef.current?.destroy()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  return (
    <div className="chart-wrap">
      <canvas ref={canvasRef} />
    </div>
  )
}
