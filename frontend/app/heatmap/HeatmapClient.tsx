"use client"

import { useState, useEffect } from "react"
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

export default function HeatmapClient({ initialData }: { initialData: HeatmapItem[] }) {
  const [data, setData] = useState<HeatmapItem[]>(initialData)
  const [hovered, setHovered] = useState<HeatmapItem | null>(null)
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

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/market/heatmap?timeframe=1d&sector=all&limit=200&min_volume=500000`)
        if (res.ok) {
          const json = await res.json()
          setData(json.items || [])
        }
      } catch {}
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const maxChange = Math.max(1, ...data.map((d) => Math.abs(d.volume_change_pct || 0)))
  const layout = computeLayout(data, dims.width, dims.height)

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-mono">
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">🔥</span>
          <h1 className="text-xl font-bold tracking-widest text-amber-500">VOLUME & OI HEATMAP</h1>
          <span className="text-xs text-slate-500">Binance Futures</span>
          <span className="text-[10px] text-slate-600">(excl. BTC, ETH, SOL, BNB)</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/60" />Volume Up</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500/60" />Volume Down</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-500/60" />Neutral</span>
        </div>
      </header>

      <main className="p-4">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[60vh] text-slate-500 text-sm">
            No data available. Try a different sector or wait for the next snapshot.
          </div>
        ) : (
          <>
            <div className="relative w-full" style={{ height: dims.height }}>
              {layout.map((cell) => {
                const change = cell.item.volume_change_pct || 0
                const bg = getColor(change, maxChange)
                const textColor = change > 0 ? "#dcfce7" : change < 0 ? "#ffe4e6" : "#e2e8f0"
                const showText = cell.w > 50 && cell.h > 35
                return (
                  <div
                    key={cell.item.symbol}
                    className="absolute border border-[#0b0f19] overflow-hidden cursor-pointer transition-opacity hover:opacity-80"
                    style={{ left: cell.x, top: cell.y, width: cell.w, height: cell.h, backgroundColor: bg }}
                    onMouseEnter={() => setHovered(cell.item)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {showText && (
                      <div className="p-1.5">
                        <div className="text-[10px] font-bold truncate" style={{ color: textColor }}>{cell.item.symbol}</div>
                        <div className="text-[9px] opacity-90" style={{ color: textColor }}>
                          {change > 0 ? "+" : ""}{change.toFixed(1)}%
                        </div>
                        {cell.w > 70 && cell.h > 50 && (
                          <div className="text-[8px] opacity-70 mt-0.5" style={{ color: textColor }}>
                            Vol {formatVolume(cell.item.quote_volume_24h)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {hovered && (
              <div className="mt-3 p-3 bg-slate-800/50 border border-slate-700 rounded text-xs text-slate-300 flex flex-wrap gap-x-6 gap-y-1">
                <span className="font-bold text-amber-400">{hovered.symbol}</span>
                <span>Price: ${hovered.price.toFixed(hovered.price < 1 ? 4 : 2)}</span>
                <span>24h: {hovered.price_change_pct > 0 ? "+" : ""}{hovered.price_change_pct.toFixed(2)}%</span>
                <span>Vol Δ: {hovered.volume_change_pct > 0 ? "+" : ""}{hovered.volume_change_pct.toFixed(1)}%</span>
                <span>OI: {formatVolume(hovered.oi)}</span>
                <span className="text-slate-500">{hovered.category}</span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
