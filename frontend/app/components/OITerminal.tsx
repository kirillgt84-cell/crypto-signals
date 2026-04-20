"use client"

import { motion } from "framer-motion"
import { Activity, BarChart3, DollarSign, Radio } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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
      <Card className="bg-gradient-to-t from-amber-500/5 to-card h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-widest text-foreground">
            <Radio className="w-4 h-4 animate-pulse" />
            OI ANALYSIS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 bg-primary/20 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getDirection = (type: "oi" | "price" | "volume"): "up" | "down" | "flat" => {
    if (!analysis?.description) return "flat"
    const desc = analysis.description.toLowerCase()
    if (type === "oi") {
      if (desc.includes("oi↑") || desc.includes("растет") || desc.includes("набир")) return "up"
      if (desc.includes("oi↓") || desc.includes("падает") || desc.includes("фиксируют")) return "down"
      if (analysis.oi_change_pct && analysis.oi_change_pct > 1) return "up"
      if (analysis.oi_change_pct && analysis.oi_change_pct < -1) return "down"
      return "flat"
    }
    if (type === "price") {
      if (desc.includes("цена↑") || desc.includes("рост") || desc.includes("восход")) return "up"
      if (desc.includes("цена↓") || desc.includes("паден") || desc.includes("нисход")) return "down"
      if (analysis.price_change_pct && analysis.price_change_pct > 0.5) return "up"
      if (analysis.price_change_pct && analysis.price_change_pct < -0.5) return "down"
      return "flat"
    }
    if (type === "volume") {
      if (desc.includes("объем↑") || desc.includes("высокий") || desc.includes("повышенный")) return "up"
      if (desc.includes("объем↓") || desc.includes("низкий")) return "down"
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

  const ProgressBar = ({ dir }: { dir: "up" | "down" | "flat" }) => {
    const color = getColor(dir)
    const pct = dir === "up" ? 75 : dir === "down" ? 25 : 50
    return (
      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    )
  }

  const formatChange = (val: number | undefined): string => {
    if (val === undefined || val === null) return "—"
    if (val === 0) return "0.00%"
    return `${val > 0 ? "+" : ""}${val.toFixed(2)}%`
  }

  return (
    <Card className="bg-gradient-to-t from-amber-500/5 to-card h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-widest text-foreground">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Radio className="w-4 h-4" style={{ color: isNeutral ? "#9ca3af" : signalColor }} />
          </motion.div>
          OI ANALYSIS
        </CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground">
          Open Interest + Price + Volume
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {analysis ? (
          <>
            {/* OI */}
            <motion.div
              className="flex items-center gap-2 p-2 rounded"
              style={{ backgroundColor: oiDir !== "flat" ? getColor(oiDir) + "10" : "transparent" }}
              initial={{ x: -10 }}
              animate={{ x: 0 }}
            >
              <BarChart3 className="w-4 h-4 shrink-0" style={{ color: getColor(oiDir) }} />
              <span className="text-sm font-bold w-14 shrink-0" style={{ color: getColor(oiDir) }}>OI</span>
              <ProgressBar dir={oiDir} />
              <span className="text-lg font-bold shrink-0" style={{ color: getColor(oiDir) }}>{getArrow(oiDir)}</span>
              <span className="text-xs w-14 text-right font-mono shrink-0" style={{ color: getColor(oiDir) }}>
                {formatChange(analysis.oi_change_pct)}
              </span>
            </motion.div>

            {/* PRICE */}
            <motion.div
              className="flex items-center gap-2 p-2 rounded"
              style={{ backgroundColor: priceDir !== "flat" ? getColor(priceDir) + "10" : "transparent" }}
              initial={{ x: -10 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <DollarSign className="w-4 h-4 shrink-0" style={{ color: getColor(priceDir) }} />
              <span className="text-sm font-bold w-14 shrink-0" style={{ color: getColor(priceDir) }}>PRICE</span>
              <ProgressBar dir={priceDir} />
              <span className="text-lg font-bold shrink-0" style={{ color: getColor(priceDir) }}>{getArrow(priceDir)}</span>
              <span className="text-xs w-14 text-right font-mono shrink-0" style={{ color: getColor(priceDir) }}>
                {formatChange(analysis.price_change_pct)}
              </span>
            </motion.div>

            {/* VOLUME */}
            <motion.div
              className="flex items-center gap-2 p-2 rounded"
              style={{ backgroundColor: volumeDir !== "flat" ? getColor(volumeDir) + "10" : "transparent" }}
              initial={{ x: -10 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Activity className="w-4 h-4 shrink-0" style={{ color: getColor(volumeDir) }} />
              <span className="text-sm font-bold w-14 shrink-0" style={{ color: getColor(volumeDir) }}>VOLUME</span>
              <ProgressBar dir={volumeDir} />
              <span className="text-lg font-bold shrink-0" style={{ color: getColor(volumeDir) }}>{getArrow(volumeDir)}</span>
              <span className="text-xs w-14 text-right font-mono shrink-0" style={{ color: getColor(volumeDir) }}>
                {formatChange(analysis.volume_change_pct)}
              </span>
            </motion.div>

            <div className="border-t border-dashed border-muted-foreground/30 pt-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground font-bold">STATUS:</span>
                <span
                  className="text-xs font-bold tracking-wider px-2 py-0.5 rounded"
                  style={{
                    color: signalColor,
                    backgroundColor: signalColor + "20",
                    border: `1px solid ${isNeutral ? "#6b7280" : signalColor}`,
                  }}
                >
                  {isBullish ? "🟢" : isBearish ? "🔴" : "⚪"} {analysis.status?.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
              <p className="text-sm leading-snug text-foreground/90">{analysis.description}</p>
              {analysis.tactic && (
                <p className="text-xs text-muted-foreground leading-snug mt-1">{analysis.tactic}</p>
              )}
            </div>

            <motion.div
              className="py-2 px-3 rounded text-center font-bold tracking-widest text-sm"
              style={{
                backgroundColor: isNeutral ? "#374151" : signalColor + "25",
                border: `2px solid ${isNeutral ? "#6b7280" : signalColor}`,
                color: isNeutral ? "#d1d5db" : signalColor,
              }}
              animate={!isNeutral ? {
                boxShadow: [
                  `0 0 0px ${signalColor}00`,
                  `0 0 15px ${signalColor}60`,
                  `0 0 0px ${signalColor}00`,
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ▓▓ {(analysis.action || "WAIT").toUpperCase()} ▓▓
            </motion.div>
          </>
        ) : (
          <div className="flex items-center justify-center text-muted-foreground text-sm py-8">
            Select symbol to initialize...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
