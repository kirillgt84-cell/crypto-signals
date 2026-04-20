"use client"

import { motion } from "framer-motion"
import { BarChart3, DollarSign, Activity, Radio, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

function getInterpretation(dir: "up" | "down" | "flat", type: string) {
  if (type === "oi") {
    if (dir === "up") return { text: "Building up", color: "text-emerald-500" }
    if (dir === "down") return { text: "Unwinding", color: "text-rose-500" }
    return { text: "Flat", color: "text-slate-400" }
  }
  if (type === "price") {
    if (dir === "up") return { text: "Rising", color: "text-emerald-500" }
    if (dir === "down") return { text: "Falling", color: "text-rose-500" }
    return { text: "Stable", color: "text-slate-400" }
  }
  if (type === "volume") {
    if (dir === "up") return { text: "High", color: "text-emerald-500" }
    if (dir === "down") return { text: "Low", color: "text-rose-500" }
    return { text: "Normal", color: "text-slate-400" }
  }
  return { text: "—", color: "text-slate-400" }
}

export function OITerminal({ analysis, loading }: OITerminalProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm h-full py-12">
        Select symbol to initialize...
      </div>
    )
  }

  const getDirection = (type: "oi" | "price" | "volume"): "up" | "down" | "flat" => {
    const desc = analysis.description?.toLowerCase() || ""
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

  const signalColor = analysis?.color || COLORS.gray
  const isBullish = signalColor === COLORS.green || signalColor === "#22c55e"
  const isBearish = signalColor === COLORS.red || signalColor === "#ef4444"
  const isNeutral = !isBullish && !isBearish

  const formatChange = (val: number | undefined): string => {
    if (val === undefined || val === null) return "—"
    if (val === 0) return "0.00%"
    return `${val > 0 ? "+" : ""}${val.toFixed(2)}%`
  }

  const metrics = [
    {
      label: "OI Change",
      value: formatChange(analysis.oi_change_pct),
      dir: oiDir,
      type: "oi" as const,
      icon: BarChart3,
      gradient: "from-indigo-500/5",
    },
    {
      label: "Price Change",
      value: formatChange(analysis.price_change_pct),
      dir: priceDir,
      type: "price" as const,
      icon: DollarSign,
      gradient: isBearish ? "from-rose-500/5" : "from-emerald-500/5",
    },
    {
      label: "Volume Change",
      value: formatChange(analysis.volume_change_pct),
      dir: volumeDir,
      type: "volume" as const,
      icon: Activity,
      gradient: "from-blue-500/5",
    },
    {
      label: "Signal",
      value: analysis.status?.replace(/_/g, " ").toUpperCase() || "NEUTRAL",
      dir: "flat" as const,
      type: "signal" as const,
      icon: Radio,
      gradient: isBullish ? "from-emerald-500/5" : isBearish ? "from-rose-500/5" : "from-amber-500/5",
      isSignal: true,
    },
  ]

  return (
    <div className="flex flex-col h-full gap-3">
      {/* 4 sub-cards */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m, i) => {
          const interp = m.isSignal
            ? { text: isBullish ? "Bullish" : isBearish ? "Bearish" : "Neutral", color: isBullish ? "text-emerald-500" : isBearish ? "text-rose-500" : "text-amber-500" }
            : getInterpretation(m.dir, m.type)
          const Icon = m.icon
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className={cn("bg-gradient-to-t to-card", m.gradient)}>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardDescription className="text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Icon className="w-3 h-3" />
                    {m.label}
                  </CardDescription>
                  <CardTitle
                    className={cn(
                      "text-base font-bold tabular-nums",
                      m.isSignal
                        ? isBullish
                          ? "text-emerald-500"
                          : isBearish
                          ? "text-rose-500"
                          : "text-amber-500"
                        : "text-foreground"
                    )}
                  >
                    {m.isSignal && (isBullish ? "🟢" : isBearish ? "🔴" : "⚪")} {m.value}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-3 px-3">
                  <p className={cn("text-[10px] font-medium", interp.color)}>{interp.text}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Description + Action */}
      <div className="mt-auto space-y-2">
        <div className="border-t border-dashed border-muted-foreground/20 pt-2">
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
      </div>
    </div>
  )
}
