"use client"

import { motion } from "framer-motion"
import { Activity, BarChart3, DollarSign, Radio } from "lucide-react"

interface OIAnalysis {
  status: string
  signal: string
  description: string
  detailed?: string
  action: string
  tactic?: string
  color: string
  strength: number
  oi_direction?: "up" | "down" | "flat"
  price_direction?: "down" | "flat" | "up"
  volume_status?: "high" | "low" | "neutral"
  oi_change_pct?: number
  price_change_pct?: number
  volume_change_pct?: number
}

interface OITerminalProps {
  analysis: OIAnalysis | null
  loading?: boolean
}

const COLORS = {
  green: "#22c55e",
  gray: "#6b7280",
  red: "#ef4444",
}

export function OITerminal({ analysis, loading }: OITerminalProps) {
  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto border-2 border-primary/30 rounded-lg bg-black/80 p-4 font-mono">
        <div className="flex items-center gap-2 text-primary mb-4">
          <Radio className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-bold tracking-wider">MARKET STATE</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-primary/20 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Parse data
  const desc = analysis?.description?.toLowerCase() || ""
  
  const getMetricData = (type: "oi" | "price" | "volume") => {
    if (!analysis) return { dir: "flat" as const, value: 0, pct: 0 }
    
    if (type === "oi") {
      const dir = analysis.oi_direction || (desc.includes("oi↑") ? "up" : desc.includes("oi↓") ? "down" : "flat")
      const pct = analysis.oi_change_pct || 0
      return { dir: dir as "up" | "down" | "flat", value: Math.abs(pct), pct }
    }
    if (type === "price") {
      const dir = analysis.price_direction || (desc.includes("цена↑") ? "up" : desc.includes("цена↓") ? "down" : "flat")
      const pct = analysis.price_change_pct || 0
      return { dir: dir as "up" | "down" | "flat", value: Math.abs(pct), pct }
    }
    if (type === "volume") {
      const stat = analysis.volume_status || (desc.includes("объем↑") ? "high" : desc.includes("объем↓") ? "low" : "neutral")
      const dir = stat === "high" ? "up" : stat === "low" ? "down" : "flat"
      const pct = analysis.volume_change_pct || 0
      return { dir, value: Math.abs(pct), pct }
    }
    return { dir: "flat" as const, value: 0, pct: 0 }
  }

  const oi = getMetricData("oi")
  const price = getMetricData("price")
  const volume = getMetricData("volume")

  const getArrow = (dir: string) => {
    if (dir === "up") return "↑"
    if (dir === "down") return "↓"
    return "="
  }

  const getColor = (dir: string) => {
    if (dir === "up") return COLORS.green
    if (dir === "down") return COLORS.red
    return COLORS.gray
  }

  const signalColor = analysis?.color || COLORS.gray
  const isBullish = signalColor === COLORS.green
  const isBearish = signalColor === COLORS.red

  // Progress bar (10 segments)
  const ProgressBar = ({ value, color }: { value: number; color: string }) => {
    const filled = Math.min(10, Math.max(0, Math.round(value / 10)))
    return (
      <span className="text-xs tracking-tighter" style={{ color }}>
        {"█".repeat(filled)}{"░".repeat(10 - filled)}
      </span>
    )
  }

  return (
    <motion.div 
      className="w-full max-w-md mx-auto border-2 rounded-lg bg-black/90 p-4 font-mono"
      style={{ borderColor: signalColor + "60" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: signalColor + "40" }}>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Radio className="w-4 h-4" style={{ color: signalColor }} />
        </motion.div>
        <span className="text-sm font-bold tracking-widest" style={{ color: signalColor }}>
          MARKET STATE
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">[LIVE]</span>
      </div>

      {analysis ? (
        <div className="space-y-3">
          {/* Metrics */}
          <div className="space-y-2">
            {/* OI */}
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground w-14">OI</span>
              <ProgressBar value={oi.value * 10} color={getColor(oi.dir)} />
              <span className="text-sm font-bold" style={{ color: getColor(oi.dir) }}>
                {getArrow(oi.dir)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {oi.pct > 0 ? `+${oi.pct.toFixed(1)}%` : `${oi.pct.toFixed(1)}%`}
              </span>
            </div>

            {/* PRICE */}
            <div className="flex items-center gap-3">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground w-14">PRICE</span>
              <ProgressBar value={price.value * 10} color={getColor(price.dir)} />
              <span className="text-sm font-bold" style={{ color: getColor(price.dir) }}>
                {getArrow(price.dir)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {price.pct > 0 ? `+${price.pct.toFixed(1)}%` : `${price.pct.toFixed(1)}%`}
              </span>
            </div>

            {/* VOLUME */}
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground w-14">VOLUME</span>
              <ProgressBar value={volume.value * 10} color={getColor(volume.dir)} />
              <span className="text-sm font-bold" style={{ color: getColor(volume.dir) }}>
                {getArrow(volume.dir)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {volume.dir === "up" ? "HIGH" : volume.dir === "down" ? "LOW" : "FLAT"}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-muted-foreground/30" />

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">STATUS:</span>
            <span 
              className="text-sm font-bold tracking-wider px-2 py-0.5 rounded"
              style={{ 
                color: signalColor,
                backgroundColor: signalColor + "20",
                border: `1px solid ${signalColor}50`
              }}
            >
              {isBullish ? "🟢" : isBearish ? "🔴" : "⚪"} {" "}
              {analysis.status?.replace(/_/g, " ").toUpperCase()}
            </span>
          </div>

          {/* Logic */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Logic:</span>
            <p className="text-xs leading-relaxed text-foreground/90">
              {analysis.description}
            </p>
            {analysis.detailed && (
              <p className="text-[11px] text-muted-foreground">
                {analysis.detailed}
              </p>
            )}
          </div>

          {/* Action */}
          <motion.div 
            className="mt-3 p-2 rounded text-center font-bold tracking-widest text-sm"
            style={{ 
              backgroundColor: signalColor + "30",
              border: `2px solid ${signalColor}`,
              color: signalColor
            }}
            animate={{ 
              boxShadow: [
                `0 0 0px ${signalColor}00`,
                `0 0 10px ${signalColor}50`,
                `0 0 0px ${signalColor}00`
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ▓▓▓▓ {analysis.action.toUpperCase()} ▓▓▓▓
          </motion.div>

          {/* Tactic */}
          {analysis.tactic && (
            <div className="pt-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tactic:</span>
              <p className="text-[11px] text-muted-foreground mt-1">{analysis.tactic}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-muted-foreground text-sm py-8">
          Select symbol to initialize...
        </div>
      )}
    </motion.div>
  )
}
