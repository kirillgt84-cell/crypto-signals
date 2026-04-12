"use client"

import { motion } from "framer-motion"
import { Activity, BarChart3, DollarSign, Radio } from "lucide-react"
import { useEffect, useState } from "react"

interface OIAnalysis {
  status: string
  signal: string
  description: string
  detailed?: string
  action: string
  tactic?: string
  color: string
  strength: number
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
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    if (analysis) {
      setLastUpdate(new Date())
    }
  }, [analysis])

  if (loading) {
    return (
      <div className="w-full h-full border-2 border-primary/30 rounded-lg bg-black/90 p-6 font-mono">
        <div className="flex items-center gap-3 text-primary mb-6">
          <Radio className="w-5 h-5 animate-pulse" />
          <span className="text-lg font-bold tracking-wider">MARKET STATE</span>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-primary/20 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Get direction from description using Unicode arrows
  const getDirection = (type: "oi" | "price" | "volume"): "up" | "down" | "flat" => {
    if (!analysis?.description) return "flat"
    
    const desc = analysis.description
    
    if (type === "oi") {
      // OI↑ = up, OI↓ = down, OI→ or OI↔ = flat
      if (desc.includes("OI↑") || desc.includes("OI растет")) return "up"
      if (desc.includes("OI↓") || desc.includes("OI падает")) return "down"
      if (desc.includes("OI→") || desc.includes("OI↔") || desc.includes("флэт")) return "flat"
      return "flat"
    }
    if (type === "price") {
      // Цена↑ = up, Цена↓ = down, Цена→ or Цена↔ = flat
      if (desc.includes("Цена↑") || desc.includes("цена↑")) return "up"
      if (desc.includes("Цена↓") || desc.includes("цена↓")) return "down"
      if (desc.includes("Цена→") || desc.includes("Цена↔") || desc.includes("цена→") || desc.includes("боковик")) return "flat"
      return "flat"
    }
    if (type === "volume") {
      // Объем↑ = high/up, Объем↓ = low/down
      if (desc.includes("Объем↑") || desc.includes("объем↑") || desc.includes("высокий")) return "up"
      if (desc.includes("Объем↓") || desc.includes("объем↓") || desc.includes("низкий")) return "down"
      return "flat"
    }
    return "flat"
  }

  const oiDir = getDirection("oi")
  const priceDir = getDirection("price")
  const volumeDir = getDirection("volume")

  const getArrow = (dir: string) => {
    if (dir === "up") return "↑"
    if (dir === "down") return "↓"
    return "→"
  }

  const getColor = (dir: string) => {
    if (dir === "up") return COLORS.green
    if (dir === "down") return COLORS.red
    return COLORS.gray
  }

  const signalColor = analysis?.color || COLORS.gray
  const isBullish = signalColor === COLORS.green || signalColor === "#22c55e"
  const isBearish = signalColor === COLORS.red || signalColor === "#ef4444"

  // Get change values from API or description
  const getChangeValue = (type: "oi" | "price" | "volume"): number => {
    if (!analysis) return 0
    if (type === "oi") return analysis.oi_change_pct || 0
    if (type === "price") return analysis.price_change_pct || 0
    if (type === "volume") return analysis.volume_change_pct || 0
    return 0
  }

  // Progress bar (15 segments) based on actual change magnitude
  const ProgressBar = ({ dir, change }: { dir: "up" | "down" | "flat"; change: number }) => {
    const color = getColor(dir)
    // Fill based on absolute change (0-10% = 1-10 segments)
    const absChange = Math.abs(change)
    const fillLevel = Math.min(15, Math.max(3, Math.round(absChange * 1.5)))
    const filled = dir === "up" ? fillLevel : dir === "down" ? fillLevel : 7
    return (
      <span className="text-base tracking-tighter font-bold" style={{ color }}>
        {"█".repeat(filled)}{"░".repeat(15 - filled)}
      </span>
    )
  }

  const formatChange = (val: number) => {
    if (val === 0) return "0.00%"
    return `${val > 0 ? "+" : ""}${val.toFixed(2)}%`
  }

  return (
    <motion.div 
      className="w-full h-full border-2 rounded-xl bg-black/95 p-6 font-mono flex flex-col"
      style={{ borderColor: signalColor + "60" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header with timestamp */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b-2" style={{ borderColor: signalColor + "40" }}>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Radio className="w-5 h-5" style={{ color: signalColor }} />
        </motion.div>
        <span className="text-xl font-bold tracking-widest" style={{ color: signalColor }}>
          MARKET STATE
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {lastUpdate.toLocaleTimeString()}
        </span>
      </div>

      {analysis ? (
        <div className="flex-1 flex flex-col space-y-5">
          {/* Metrics */}
          <div className="space-y-4">
            {/* OI */}
            <motion.div 
              className="flex items-center gap-4"
              key={`oi-${oiDir}-${lastUpdate.getTime()}`}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <span className="text-base text-muted-foreground w-20 font-bold">OI</span>
              <ProgressBar dir={oiDir} change={getChangeValue("oi")} />
              <span className="text-2xl font-bold" style={{ color: getColor(oiDir) }}>
                {getArrow(oiDir)}
              </span>
              <span className="text-xs text-muted-foreground w-16 text-right">
                {formatChange(getChangeValue("oi"))}
              </span>
            </motion.div>

            {/* PRICE */}
            <motion.div 
              className="flex items-center gap-4"
              key={`price-${priceDir}-${lastUpdate.getTime()}`}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <span className="text-base text-muted-foreground w-20 font-bold">PRICE</span>
              <ProgressBar dir={priceDir} change={getChangeValue("price")} />
              <span className="text-2xl font-bold" style={{ color: getColor(priceDir) }}>
                {getArrow(priceDir)}
              </span>
              <span className="text-xs text-muted-foreground w-16 text-right">
                {formatChange(getChangeValue("price"))}
              </span>
            </motion.div>

            {/* VOLUME */}
            <motion.div 
              className="flex items-center gap-4"
              key={`vol-${volumeDir}-${lastUpdate.getTime()}`}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Activity className="w-5 h-5 text-muted-foreground" />
              <span className="text-base text-muted-foreground w-20 font-bold">VOLUME</span>
              <ProgressBar dir={volumeDir} change={getChangeValue("volume")} />
              <span className="text-2xl font-bold" style={{ color: getColor(volumeDir) }}>
                {getArrow(volumeDir)}
              </span>
              <span className="text-xs text-muted-foreground w-16 text-right">
                {volumeDir === "up" ? "HIGH" : volumeDir === "down" ? "LOW" : "NEUTRAL"}
              </span>
            </motion.div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-dashed border-muted-foreground/30" />

          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-base text-muted-foreground font-bold">STATUS:</span>
            <motion.span 
              className="text-lg font-bold tracking-wider px-4 py-1.5 rounded-lg"
              style={{ 
                color: signalColor,
                backgroundColor: signalColor + "20",
                border: `2px solid ${signalColor}60`
              }}
              key={analysis.status}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              {isBullish ? "●" : isBearish ? "●" : "○"} {" "}
              {analysis.status?.replace(/_/g, " ").toUpperCase()}
            </motion.span>
          </div>

          {/* Logic */}
          <div className="flex-1 space-y-2">
            <span className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Logic:</span>
            <motion.p 
              className="text-base leading-relaxed text-foreground/90 font-medium"
              key={analysis.description}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {analysis.description || "Analyzing market data..."}
            </motion.p>
            {analysis.detailed && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analysis.detailed}
              </p>
            )}
          </div>

          {/* Tactic */}
          {analysis.tactic && (
            <div className="pt-2">
              <span className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Tactic:</span>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{analysis.tactic}</p>
            </div>
          )}

          {/* Action */}
          <motion.div 
            className="mt-auto p-4 rounded-lg text-center font-bold tracking-widest text-xl"
            style={{ 
              backgroundColor: signalColor + "25",
              border: `3px solid ${signalColor}`,
              color: signalColor
            }}
            key={analysis.action}
            animate={{ 
              boxShadow: [
                `0 0 0px ${signalColor}00`,
                `0 0 20px ${signalColor}60`,
                `0 0 0px ${signalColor}00`
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ▓▓▓▓ {(analysis.action || "WAIT").toUpperCase()} ▓▓▓▓
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-lg">
          Select symbol to initialize...
        </div>
      )}
    </motion.div>
  )
}
