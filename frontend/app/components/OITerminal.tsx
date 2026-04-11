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

  // Parse directions from description
  const desc = analysis?.description?.toLowerCase() || ""
  
  // Extract direction from description symbols
  const getDirection = (type: "oi" | "price" | "volume"): "up" | "down" | "flat" => {
    if (!analysis) return "flat"
    
    // Check for arrows in description
    if (type === "oi") {
      if (desc.includes("oi↑") || desc.includes("растет")) return "up"
      if (desc.includes("oi↓") || desc.includes("падает")) return "down"
      return "flat"
    }
    if (type === "price") {
      if (desc.includes("цена↑") || desc.includes("цена растет")) return "up"
      if (desc.includes("цена↓") || desc.includes("цена падает")) return "down"
      return "flat"
    }
    if (type === "volume") {
      if (desc.includes("объем↑") || desc.includes("высокий")) return "up"
      if (desc.includes("объем↓") || desc.includes("низкий")) return "down"
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

  // Progress bar (15 segments)
  const ProgressBar = ({ dir }: { dir: "up" | "down" | "flat" }) => {
    const color = getColor(dir)
    const filled = dir === "up" ? 12 : dir === "down" ? 3 : 7
    return (
      <span className="text-base tracking-tighter font-bold" style={{ color }}>
        {"█".repeat(filled)}{"░".repeat(15 - filled)}
      </span>
    )
  }

  return (
    <motion.div 
      className="w-full h-full border-2 rounded-xl bg-black/95 p-6 font-mono flex flex-col"
      style={{ borderColor: signalColor + "60" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
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
        <span className="ml-auto text-sm text-muted-foreground font-bold">[LIVE]</span>
      </div>

      {analysis ? (
        <div className="flex-1 flex flex-col space-y-5">
          {/* Metrics */}
          <div className="space-y-4">
            {/* OI */}
            <div className="flex items-center gap-4">
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <span className="text-base text-muted-foreground w-20 font-bold">OI</span>
              <ProgressBar dir={oiDir} />
              <span className="text-2xl font-bold" style={{ color: getColor(oiDir) }}>
                {getArrow(oiDir)}
              </span>
            </div>

            {/* PRICE */}
            <div className="flex items-center gap-4">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <span className="text-base text-muted-foreground w-20 font-bold">PRICE</span>
              <ProgressBar dir={priceDir} />
              <span className="text-2xl font-bold" style={{ color: getColor(priceDir) }}>
                {getArrow(priceDir)}
              </span>
            </div>

            {/* VOLUME */}
            <div className="flex items-center gap-4">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <span className="text-base text-muted-foreground w-20 font-bold">VOLUME</span>
              <ProgressBar dir={volumeDir} />
              <span className="text-2xl font-bold" style={{ color: getColor(volumeDir) }}>
                {getArrow(volumeDir)}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-dashed border-muted-foreground/30" />

          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-base text-muted-foreground font-bold">STATUS:</span>
            <span 
              className="text-lg font-bold tracking-wider px-4 py-1.5 rounded-lg"
              style={{ 
                color: signalColor,
                backgroundColor: signalColor + "20",
                border: `2px solid ${signalColor}60`
              }}
            >
              {isBullish ? "●" : isBearish ? "●" : "○"} {" "}
              {analysis.status?.replace(/_/g, " ").toUpperCase()}
            </span>
          </div>

          {/* Logic */}
          <div className="flex-1 space-y-2">
            <span className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Logic:</span>
            <p className="text-base leading-relaxed text-foreground/90 font-medium">
              {analysis.description}
            </p>
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
            animate={{ 
              boxShadow: [
                `0 0 0px ${signalColor}00`,
                `0 0 20px ${signalColor}60`,
                `0 0 0px ${signalColor}00`
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ▓▓▓▓ {analysis.action.toUpperCase()} ▓▓▓▓
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
