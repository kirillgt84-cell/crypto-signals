"use client"

import { motion } from "framer-motion"
import { Activity, BarChart3, DollarSign, Radio } from "lucide-react"
import { useLanguage } from "../context/LanguageContext"

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
  const { t, language } = useLanguage()
  
  // Force re-render on language change
  const _ = language

  if (loading) {
    return (
      <div className="w-full h-full border-2 border-primary/30 rounded-lg bg-card p-4 font-mono">
        <div className="flex items-center gap-2 text-primary mb-4">
          <Radio className="w-4 h-4 animate-pulse" />
          <span className="text-base font-bold tracking-wider">{t("oiTerminal.title")}</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-primary/20 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Parse directions from description with fallbacks to change percentages
  const getDirection = (type: "oi" | "price" | "volume"): "up" | "down" | "flat" => {
    if (!analysis?.description) return "flat"
    
    const desc = analysis.description.toLowerCase()
    
    // Check description first
    if (type === "oi") {
      if (desc.includes("oi↑") || desc.includes("растет") || desc.includes("набир")) return "up"
      if (desc.includes("oi↓") || desc.includes("падает") || desc.includes("фиксируют")) return "down"
      // Fallback to percentage if available
      if (analysis.oi_change_pct && analysis.oi_change_pct > 1) return "up"
      if (analysis.oi_change_pct && analysis.oi_change_pct < -1) return "down"
      return "flat"
    }
    if (type === "price") {
      if (desc.includes("цена↑") || desc.includes("рост") || desc.includes("восход")) return "up"
      if (desc.includes("цена↓") || desc.includes("паден") || desc.includes("нисход")) return "down"
      // Fallback to percentage
      if (analysis.price_change_pct && analysis.price_change_pct > 0.5) return "up"
      if (analysis.price_change_pct && analysis.price_change_pct < -0.5) return "down"
      return "flat"
    }
    if (type === "volume") {
      if (desc.includes("объем↑") || desc.includes("высокий") || desc.includes("повышенный")) return "up"
      if (desc.includes("объем↓") || desc.includes("низкий")) return "down"
      // Fallback to percentage
      if (analysis.volume_change_pct && analysis.volume_change_pct > 10) return "up"
      if (analysis.volume_change_pct && analysis.volume_change_pct < -10) return "down"
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
  const isNeutral = !isBullish && !isBearish

  // Progress bar (12 segments) based on direction
  const ProgressBar = ({ dir }: { dir: "up" | "down" | "flat" }) => {
    const color = getColor(dir)
    // Default fill based on direction
    const filled = dir === "up" ? 9 : dir === "down" ? 3 : 6
    return (
      <span className="text-sm tracking-tighter font-bold" style={{ color }}>
        {"█".repeat(filled)}{"░".repeat(12 - filled)}
      </span>
    )
  }

  const formatChange = (val: number | undefined): string => {
    if (val === undefined || val === null) return "—"
    if (val === 0) return "0.00%"
    return `${val > 0 ? "+" : ""}${val.toFixed(2)}%`
  }

  return (
    <motion.div 
      className="w-full h-full border-2 rounded-xl bg-card p-4 font-mono flex flex-col"
      style={{ 
        borderColor: isNeutral ? "hsl(var(--muted-foreground))" : signalColor + "60"
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b-2" style={{ borderColor: isNeutral ? "#4b5563" : signalColor + "40" }}>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Radio className="w-4 h-4" style={{ color: isNeutral ? "#9ca3af" : signalColor }} />
        </motion.div>
        <span className="text-base font-bold tracking-widest" style={{ color: isNeutral ? "#9ca3af" : signalColor }}>
          MARKET STATE
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      {analysis ? (
        <div className="flex-1 flex flex-col space-y-4">
          {/* Metrics - Compact */}
          <div className="space-y-1">
            {/* OI */}
            <motion.div 
              className="flex items-center gap-2 p-1.5 rounded"
              style={{ backgroundColor: oiDir !== "flat" ? getColor(oiDir) + "10" : "transparent" }}
              key={`oi-${oiDir}`}
              initial={{ x: -10 }}
              animate={{ x: 0 }}
            >
              <BarChart3 className="w-4 h-4" style={{ color: getColor(oiDir) }} />
              <span className="text-sm font-bold w-14" style={{ color: getColor(oiDir) }}>OI</span>
              <ProgressBar dir={oiDir} />
              <span className="text-xl font-bold" style={{ color: getColor(oiDir) }}>
                {getArrow(oiDir)}
              </span>
              <span className="text-xs w-14 text-right font-mono" style={{ color: getColor(oiDir) }}>
                {formatChange(analysis.oi_change_pct)}
              </span>
            </motion.div>

            {/* PRICE */}
            <motion.div 
              className="flex items-center gap-2 p-1.5 rounded"
              style={{ backgroundColor: priceDir !== "flat" ? getColor(priceDir) + "10" : "transparent" }}
              key={`price-${priceDir}`}
              initial={{ x: -10 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <DollarSign className="w-4 h-4" style={{ color: getColor(priceDir) }} />
              <span className="text-sm font-bold w-14" style={{ color: getColor(priceDir) }}>PRICE</span>
              <ProgressBar dir={priceDir} />
              <span className="text-xl font-bold" style={{ color: getColor(priceDir) }}>
                {getArrow(priceDir)}
              </span>
              <span className="text-xs w-14 text-right font-mono" style={{ color: getColor(priceDir) }}>
                {formatChange(analysis.price_change_pct)}
              </span>
            </motion.div>

            {/* VOLUME */}
            <motion.div 
              className="flex items-center gap-2 p-1.5 rounded"
              style={{ backgroundColor: volumeDir !== "flat" ? getColor(volumeDir) + "10" : "transparent" }}
              key={`vol-${volumeDir}`}
              initial={{ x: -10 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Activity className="w-4 h-4" style={{ color: getColor(volumeDir) }} />
              <span className="text-sm font-bold w-14" style={{ color: getColor(volumeDir) }}>VOLUME</span>
              <ProgressBar dir={volumeDir} />
              <span className="text-xl font-bold" style={{ color: getColor(volumeDir) }}>
                {getArrow(volumeDir)}
              </span>
              <span className="text-xs w-14 text-right font-mono" style={{ color: getColor(volumeDir) }}>
                {formatChange(analysis.volume_change_pct)}
              </span>
            </motion.div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-dashed border-muted-foreground/30" />

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-bold">STATUS:</span>
            <motion.span 
              className="text-xs font-bold tracking-wider px-2 py-1 rounded"
              style={{ 
                color: signalColor,
                backgroundColor: signalColor + "20",
                border: `1px solid ${isNeutral ? "#6b7280" : signalColor}`,
                boxShadow: isNeutral ? "0 0 8px rgba(107, 114, 128, 0.3)" : "none"
              }}
            >
              {isBullish ? "🟢" : isBearish ? "🔴" : "⚪"} {" "}
              {analysis.status?.replace(/_/g, " ").toUpperCase()}
            </motion.span>
          </div>

          {/* Logic */}
          {/* Logic - Single line or compact */}
          <div className="space-y-1">
            <p className="text-sm leading-snug text-foreground/90">
              {analysis.description || "Analyzing market data..."}
            </p>
            {analysis.tactic && (
              <p className="text-xs text-muted-foreground leading-snug">{analysis.tactic}</p>
            )}
          </div>

          {/* Action */}
          <motion.div 
            className="mt-auto py-2 px-3 rounded text-center font-bold tracking-widest text-sm"
            style={{ 
              backgroundColor: isNeutral ? "#374151" : signalColor + "25",
              border: `2px solid ${isNeutral ? "#6b7280" : signalColor}`,
              color: isNeutral ? "#d1d5db" : signalColor
            }}
            animate={!isNeutral ? { 
              boxShadow: [
                `0 0 0px ${signalColor}00`,
                `0 0 15px ${signalColor}60`,
                `0 0 0px ${signalColor}00`
              ]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ▓▓ {(analysis.action || "WAIT").toUpperCase()} ▓▓
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
