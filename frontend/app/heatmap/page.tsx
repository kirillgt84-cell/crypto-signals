"use client"

import { useEffect, useState } from "react"
import { hierarchy, treemap as d3Treemap } from "d3-hierarchy"

const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

interface HeatmapItem {
  symbol: string
  category: string
  price: number
  price_change_pct: number
  quote_volume_24h: number
  volume_change_pct: number
  oi: number
  oi_change_pct: number
}

function computeLayout(items: HeatmapItem[], width: number, height: number) {
  if (!items.length || width <= 0 || height <= 0) return []
  const root = hierarchy<any>({
    children: items.map((item) => ({ value: Math.sqrt(item.quote_volume_24h || 0), item })),
  })
    .sum((d: any) => d.value || 0)
    .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))

  d3Treemap<any>()
    .size([width, height])
    .paddingInner(1)
    .paddingOuter(1)
    .round(true)(root)

  return root.leaves().map((leaf: any) => ({
    x: leaf.x0,
    y: leaf.y0,
    w: leaf.x1 - leaf.x0,
    h: leaf.y1 - leaf.y0,
    item: leaf.data.item as HeatmapItem,
  }))
}

export default function HeatmapPage() {
  const [data, setData] = useState<HeatmapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dims, setDims] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const update = () => {
      setDims({
        width: Math.max(320, window.innerWidth - 32),
        height: Math.max(400, window.innerHeight - 180),
      })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch(`${API_BASE_URL}/market/heatmap?timeframe=1d&sector=all&limit=50&min_volume=500000`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) setData(json.items || [])
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  const layout = computeLayout(data, dims.width, dims.height)

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-4">
      <h1 className="text-lg font-bold text-amber-500 mb-2">Heatmap Debug</h1>
      <div className="text-xs text-slate-400 mb-4">
        loading={loading.toString()} | error={error || "none"} | items={data.length} | layout={layout.length} | dims={dims.width}x{dims.height}
      </div>

      {error && <div className="text-red-400 text-sm mb-4">Error: {error}</div>}

      {loading && <div className="text-amber-500">Loading...</div>}

      {!loading && data.length === 0 && <div className="text-slate-500">No data returned</div>}

      <div className="relative w-full mt-4" style={{ height: dims.height, background: "#1e293b" }}>
        {layout.map((cell) => (
          <div
            key={cell.item.symbol}
            className="absolute border border-[#0b0f19]"
            style={{
              left: cell.x,
              top: cell.y,
              width: cell.w,
              height: cell.h,
              backgroundColor: cell.item.volume_change_pct > 0 ? "rgba(34,197,94,0.5)" : "rgba(244,63,94,0.5)",
            }}
          >
            {cell.w > 30 && cell.h > 20 && (
              <span className="text-[8px] text-white p-0.5">{cell.item.symbol}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
