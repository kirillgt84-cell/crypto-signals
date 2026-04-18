"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Treemap, ResponsiveContainer } from "recharts"
import { Loader2, Flame } from "lucide-react"
import { cn } from "@/lib/utils"

const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

const TIMEFRAMES = [
  { value: "m15", label: "M15" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
]

const SECTORS = [
  { value: "all", label: "All Sectors" },
  { value: "Meme", label: "Meme" },
  { value: "DeFi", label: "DeFi" },
  { value: "AI", label: "AI" },
  { value: "Gaming", label: "Gaming" },
  { value: "Layer-1", label: "Layer-1" },
  { value: "Layer-2", label: "Layer-2" },
  { value: "Infrastructure", label: "Infra" },
  { value: "PoW", label: "PoW" },
  { value: "Metaverse", label: "Metaverse" },
  { value: "Storage", label: "Storage" },
  { value: "NFT", label: "NFT" },
  { value: "Payment", label: "Payment" },
  { value: "RWA", label: "RWA" },
  { value: "Alpha", label: "Alpha" },
]

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
  if (change > 0) {
    // emerald green
    const alpha = 0.25 + intensity * 0.75
    return `rgba(34, 197, 94, ${alpha})`
  }
  if (change < 0) {
    // rose red
    const alpha = 0.25 + intensity * 0.75
    return `rgba(244, 63, 94, ${alpha})`
  }
  return "rgba(100, 116, 139, 0.3)"
}

function formatVolume(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toFixed(0)
}

function TreemapCell(props: any) {
  const { x, y, width, height, name, payload } = props
  if (!payload || width <= 0 || height <= 0) return null
  const change = payload?.volume_change_pct || 0
  const maxChange = payload?._maxChange || 50
  const bg = getColor(change, maxChange)
  const textColor = change > 0 ? "#dcfce7" : change < 0 ? "#ffe4e6" : "#e2e8f0"

  if (width < 40 || height < 30) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={bg} stroke="#0b0f19" strokeWidth={1.5} rx={3} />
      </g>
    )
  }

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={bg} stroke="#0b0f19" strokeWidth={1.5} rx={3} />
      <text x={x + 6} y={y + 16} fill={textColor} fontSize={11} fontWeight="bold">
        {name}
      </text>
      <text x={x + 6} y={y + 30} fill={textColor} fontSize={9} opacity={0.85}>
        {change > 0 ? "+" : ""}{change.toFixed(1)}%
      </text>
      {width > 70 && height > 45 && (
        <text x={x + 6} y={y + 42} fill={textColor} fontSize={8} opacity={0.7}>
          Vol {formatVolume(payload.quote_volume_24h)}
        </text>
      )}
    </g>
  )
}

function HeatmapContent() {
  const searchParams = useSearchParams()
  const [timeframe, setTimeframe] = useState(searchParams.get("tf") || "1h")
  const [sector, setSector] = useState(searchParams.get("sector") || "all")
  const [data, setData] = useState<HeatmapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const update = () => {
      setChartSize({
        width: window.innerWidth - 32,
        height: Math.max(400, window.innerHeight - 180),
      })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = `${API_BASE_URL}/market/heatmap?timeframe=${timeframe}&sector=${sector}&limit=200&min_volume=500000`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json.items || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [timeframe, sector])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Prepare treemap data
  const maxChange = Math.max(
    1,
    ...data.map((d) => Math.abs(d.volume_change_pct || 0))
  )

  const treemapData = data.map((item) => ({
    name: item.symbol,
    size: Math.sqrt(item.quote_volume_24h || 0),
    ...item,
    _maxChange: maxChange,
  }))

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-mono">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <Flame className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold tracking-widest text-amber-500">
            VOLUME & OI HEATMAP
          </h1>
          <span className="text-xs text-slate-500">Binance Futures</span>
          <span className="text-[10px] text-slate-600">(excl. BTC, ETH, SOL, BNB)</span>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframes */}
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded border transition-colors",
                  timeframe === tf.value
                    ? "bg-amber-500 text-black border-amber-500"
                    : "bg-[#0b0f19] text-slate-400 border-slate-700 hover:border-amber-500/50"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-slate-700" />

          {/* Sectors */}
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="bg-[#0b0f19] text-xs text-slate-300 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
          >
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500/60" />
              Volume Up
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-rose-500/60" />
              Volume Down
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            Error: {error}
          </div>
        )}

        <div className="w-full relative" style={{ height: chartSize.height || 400 }}>
          {loading && data.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          )}

          {!loading && data.length === 0 && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
              No data available. Try a different sector or wait for the next snapshot.
            </div>
          )}

          {treemapData.length > 0 && chartSize.width > 0 && chartSize.height > 0 && (
            <Treemap
              width={chartSize.width}
              height={chartSize.height}
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#0b0f19"
              fill="#8884d8"
              content={<TreemapCell />}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default function HeatmapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    }>
      <HeatmapContent />
    </Suspense>
  )
}
