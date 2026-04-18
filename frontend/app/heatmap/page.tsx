"use client"

import { useEffect, useState, useCallback } from "react"
import { Loader2, Flame } from "lucide-react"
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

function getColor(change: number, maxChange: number) {
  const intensity = Math.min(Math.abs(change) / (maxChange || 1), 1)
  if (change > 0) return `rgba(34, 197, 94, ${0.25 + intensity * 0.75})`
  if (change < 0) return `rgba(244, 63, 94, ${0.25 + intensity * 0.75})`
  return "rgba(100, 116, 139, 0.3)"
}

function formatVolume(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toFixed(0)
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
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE_URL}/market/heatmap?timeframe=1h&sector=all&limit=200&min_volume=500000`)
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

  const maxChange = Math.max(1, ...data.map((d) => Math.abs(d.volume_change_pct || 0)))
  const layout = computeLayout(data, dims.width, dims.height)

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-mono">
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold tracking-widest text-amber-500">VOLUME & OI HEATMAP</h1>
        </div>
      </header>

      <main className="p-4">
        {error && <div className="text-red-400 text-sm">Error: {error}</div>}

        <div className="w-full relative bg-slate-900/30 rounded" style={{ height: dims.height }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          )}

          {!loading && data.length === 0 && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
              No data
            </div>
          )}

          {layout.map((cell) => {
            const change = cell.item.volume_change_pct || 0
            const bg = getColor(change, maxChange)
            return (
              <div
                key={cell.item.symbol}
                className="absolute border border-[#0b0f19] overflow-hidden"
                style={{
                  left: cell.x,
                  top: cell.y,
                  width: cell.w,
                  height: cell.h,
                  backgroundColor: bg,
                }}
                title={`${cell.item.symbol} ${change.toFixed(1)}%`}
              >
                {cell.w > 40 && cell.h > 25 && (
                  <div className="p-1">
                    <div className="text-[9px] font-bold text-white truncate">{cell.item.symbol}</div>
                    <div className="text-[8px] text-white/80">{change > 0 ? "+" : ""}{change.toFixed(1)}%</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
