"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSidebar } from "@/hooks/useSidebar"
import { hierarchy, treemap as d3Treemap } from "d3-hierarchy"
import { cn } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
import Sidebar from "../components/admin/Sidebar"

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
  if (change > 0) return `rgba(34, 197, 94, ${0.25 + intensity * 0.75})`
  if (change < 0) return `rgba(244, 63, 94, ${0.25 + intensity * 0.75})`
  return "rgba(100, 116, 139, 0.55)"
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
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar()
  const [timeframe, setTimeframe] = useState("m15")
  const [sector, setSector] = useState("all")
  const [minVolume, setMinVolume] = useState(500000)
  const [data, setData] = useState<HeatmapItem[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hovered, setHovered] = useState<HeatmapItem | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = `${API_BASE_URL}/market/heatmap?timeframe=${timeframe}&sector=${sector}&limit=200&min_volume=${minVolume}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json.items || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [timeframe, sector, minVolume])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filteredData = useMemo(() => {
    if (sector === "all") return data
    return data.filter((d) => d.category === sector)
  }, [data, sector])

  const groupedBySector = useMemo(() => {
    const map = new Map<string, HeatmapItem[]>()
    for (const item of filteredData) {
      const cat = item.category || "Other"
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    return Array.from(map.entries())
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => b.items.length - a.items.length)
  }, [filteredData])

  const maxChange = Math.max(1, ...filteredData.map((d) => Math.abs(d.volume_change_pct || 0)))

  const isSingleSector = sector !== "all"

  return (
    <div className="flex min-h-screen bg-background text-foreground font-mono">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main className={cn("flex-1 overflow-hidden transition-all duration-300", sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")}>
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl">🔥</span>
          <h1 className="text-xl font-bold tracking-widest text-amber-500">VOLUME HEATMAP</h1>
          <span className="text-xs text-slate-500">Binance Futures</span>
          <span className="text-[10px] text-slate-600">(excl. BTC, ETH, SOL, BNB)</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded border transition-colors",
                  timeframe === tf.value
                    ? "bg-amber-500 text-black border-amber-500"
                    : "bg-card text-muted-foreground border-border hover:border-amber-500/50"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-slate-700" />

          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="bg-card text-xs text-muted-foreground border border-border rounded px-2 py-1 focus:outline-none focus:border-amber-500"
          >
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <div className="w-px h-5 bg-slate-700" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">Min Vol</span>
            <input
              type="range"
              min={0}
              max={10000000}
              step={100000}
              value={minVolume}
              onChange={(e) => setMinVolume(Number(e.target.value))}
              className="w-24 h-1 cursor-pointer accent-amber-500 bg-slate-700 rounded appearance-none"
            />
            <span className="text-[10px] text-slate-400 w-12 text-right">
              ${(minVolume / 1e6).toFixed(1)}M
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/60" />Volume Up</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500/60" />Volume Down</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-500/60" />Neutral</span>
          </div>
        </div>
      </header>

      <div className="p-4">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 mb-4">
            Error: {error}
          </div>
        )}

        {loading && data.length === 0 && (
          <div className="flex items-center justify-center h-[60vh]">
            <span className="text-amber-500 animate-pulse">Loading...</span>
          </div>
        )}

        {!loading && data.length === 0 && !error && (
          <div className="flex items-center justify-center h-[60vh] text-slate-500 text-sm">
            No data available. Try a different sector or wait for the next snapshot.
          </div>
        )}

        {isSingleSector && (
          <button
            onClick={() => setSector("all")}
            className="mb-3 flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> All Sectors
          </button>
        )}

        {isSingleSector ? (
          <SectorTreemap
            name={sector}
            items={filteredData}
            maxChange={maxChange}
            height={600}
            onHover={setHovered}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedBySector.map((group) => (
              <SectorTreemap
                key={group.name}
                name={group.name}
                items={group.items}
                maxChange={maxChange}
                height={300}
                onHover={setHovered}
                onSelect={() => setSector(group.name)}
              />
            ))}
          </div>
        )}

        {hovered && (
          <div className="mt-3 p-3 bg-muted border border-border rounded text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
            <span className="font-bold text-amber-400">{hovered.symbol}</span>
            <span>Price: ${hovered.price.toFixed(hovered.price < 1 ? 4 : 2)}</span>
            <span>24h: {hovered.price_change_pct > 0 ? "+" : ""}{hovered.price_change_pct.toFixed(2)}%</span>
            <span>Vol Δ: {hovered.volume_change_pct > 0 ? "+" : ""}{hovered.volume_change_pct.toFixed(1)}%</span>
            <span>OI: {hovered.oi >= 1e6 ? `${(hovered.oi / 1e6).toFixed(1)}M` : hovered.oi >= 1e3 ? `${(hovered.oi / 1e3).toFixed(1)}K` : hovered.oi.toFixed(0)}</span>
            <span className="text-slate-500">{hovered.category}</span>
          </div>
        )}
      </div>
    </main>
  </div>
  )
}

function SectorTreemap({
  name,
  items,
  maxChange,
  height,
  onHover,
  onSelect,
}: {
  name: string
  items: HeatmapItem[]
  maxChange: number
  height: number
  onHover: (item: HeatmapItem | null) => void
  onSelect?: () => void
}) {
  const [width, setWidth] = useState(400)
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) setWidth(node.getBoundingClientRect().width)
  }, [])

  const layout = useMemo(() => computeLayout(items, width, height), [items, width, height])

  return (
    <div
      ref={ref}
      className={cn(
        "border border-slate-800 rounded-lg overflow-hidden",
        onSelect && "cursor-pointer hover:border-amber-500/40 transition-colors"
      )}
      onClick={onSelect}
    >
      <div className="px-3 py-2 bg-muted border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{name}</span>
          <span className="text-[10px] text-slate-500">{items.length} coins</span>
        </div>
        {onSelect && (
          <span className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors">Open →</span>
        )}
      </div>
      <div className="relative" style={{ height }}>
        {layout.map((cell) => {
          const change = cell.item.volume_change_pct || 0
          const bg = getColor(change, maxChange)
          const textColor = change > 0 ? "#dcfce7" : change < 0 ? "#ffe4e6" : "#e2e8f0"

          const minDim = Math.min(cell.w, cell.h)
          const symbolSize = Math.min(Math.max(minDim / 5.5, 8), 16)
          const percentSize = Math.min(Math.max(minDim / 7.5, 7), 13)
          const showText = minDim > 32

          return (
            <div
              key={cell.item.symbol}
              className="absolute border border-[#0b0f19] overflow-hidden cursor-pointer transition-opacity hover:opacity-80"
              style={{ left: cell.x, top: cell.y, width: cell.w, height: cell.h, backgroundColor: bg }}
              onMouseEnter={() => onHover(cell.item)}
              onMouseLeave={() => onHover(null)}
              onClick={(e) => e.stopPropagation()}
            >
              {showText && (
                <div className="p-1" style={{ whiteSpace: "nowrap", overflow: "hidden" }}>
                  <div
                    className="font-bold truncate"
                    style={{ color: textColor, fontSize: `${symbolSize}px`, lineHeight: 1.2 }}
                  >
                    {cell.item.symbol}
                  </div>
                  <div
                    className="opacity-90"
                    style={{ color: textColor, fontSize: `${percentSize}px`, lineHeight: 1.2 }}
                  >
                    {change > 0 ? "+" : ""}{change.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
