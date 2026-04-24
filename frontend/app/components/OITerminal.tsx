"use client"

import { motion } from "framer-motion"
import { Zap, BarChart4, BadgeDollarSign, Radio } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  const { t } = useLanguage()
  if (loading) {
    return (
      <Card className="bg-gradient-to-t from-amber-500/5 to-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-widest text-foreground">
            <Radio className="w-4 h-4 animate-pulse" />
            {t("oiPanel.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-primary/20 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getDirection = (type: "oi" | "price" | "volume"): "up" | "down" | "flat" => {
    if (!analysis) return "flat"
    if (type === "oi") {
      if (analysis.oi_change_pct !== undefined && analysis.oi_change_pct > 1.0) return "up"
      if (analysis.oi_change_pct !== undefined && analysis.oi_change_pct < -1.0) return "down"
      return "flat"
    }
    if (type === "price") {
      if (analysis.price_change_pct !== undefined && analysis.price_change_pct > 0.5) return "up"
      if (analysis.price_change_pct !== undefined && analysis.price_change_pct < -0.5) return "down"
      return "flat"
    }
    if (type === "volume") {
      if (analysis.volume_change_pct !== undefined && analysis.volume_change_pct > 10) return "up"
      if (analysis.volume_change_pct !== undefined && analysis.volume_change_pct < -10) return "down"
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
      <div className="h-2.5 flex-1 bg-muted rounded-full overflow-hidden">
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
    <Card className="bg-gradient-to-t from-amber-500/5 to-card h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-widest text-foreground">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Radio className="w-4 h-4" style={{ color: isNeutral ? "#9ca3af" : signalColor }} />
          </motion.div>
          {t("oiPanel.title")}
        </CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground">
          {t("oiPanel.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {analysis ? (
          <div className="flex-1 flex flex-col justify-between gap-4">
            {/* OI */}
            <motion.div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: oiDir !== "flat" ? getColor(oiDir) + "10" : "transparent" }}
              initial={{ x: -10 }}
              animate={{ x: 0 }}
            >
              <BarChart4 className="w-5 h-5 shrink-0" style={{ color: getColor(oiDir) }} />
              <span className="text-sm font-bold w-14 shrink-0" style={{ color: getColor(oiDir) }}>OI</span>
              <ProgressBar dir={oiDir} />
              <span className="text-xl font-bold shrink-0" style={{ color: getColor(oiDir) }}>{getArrow(oiDir)}</span>
              <span className="text-xs w-16 text-right font-mono shrink-0" style={{ color: getColor(oiDir) }}>
                {formatChange(analysis.oi_change_pct)}
              </span>
            </motion.div>

            {/* PRICE */}
            <motion.div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: priceDir !== "flat" ? getColor(priceDir) + "10" : "transparent" }}
              initial={{ x: -10 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <BadgeDollarSign className="w-5 h-5 shrink-0" style={{ color: getColor(priceDir) }} />
              <span className="text-sm font-bold w-14 shrink-0" style={{ color: getColor(priceDir) }}>PRICE</span>
              <ProgressBar dir={priceDir} />
              <span className="text-xl font-bold shrink-0" style={{ color: getColor(priceDir) }}>{getArrow(priceDir)}</span>
              <span className="text-xs w-16 text-right font-mono shrink-0" style={{ color: getColor(priceDir) }}>
                {formatChange(analysis.price_change_pct)}
              </span>
            </motion.div>

            {/* VOLUME */}
            <motion.div
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: volumeDir !== "flat" ? getColor(volumeDir) + "10" : "transparent" }}
              initial={{ x: -10 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Zap className="w-5 h-5 shrink-0" style={{ color: getColor(volumeDir) }} />
              <span className="text-sm font-bold w-14 shrink-0" style={{ color: getColor(volumeDir) }}>VOLUME</span>
              <ProgressBar dir={volumeDir} />
              <span className="text-xl font-bold shrink-0" style={{ color: getColor(volumeDir) }}>{getArrow(volumeDir)}</span>
              <span className="text-xs w-16 text-right font-mono shrink-0" style={{ color: getColor(volumeDir) }}>
                {formatChange(analysis.volume_change_pct)}
              </span>
            </motion.div>

            <div className="border-t border-dashed border-muted-foreground/30 pt-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground font-bold">{t("oiPanel.status")}:</span>
                <span
                  className="text-xs font-bold tracking-wider px-2 py-0.5 rounded"
                  style={{
                    color: signalColor,
                    backgroundColor: signalColor + "20",
                    border: `1px solid ${isNeutral ? "#6b7280" : signalColor}`,
                  }}
                >
                  {isBullish ? "🟢" : isBearish ? "🔴" : "⚪"} {t(`oi.status.${analysis.status}`)}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">{t(analysis.description)}</p>
              {analysis.tactic && (
                <p className="text-xs text-muted-foreground leading-relaxed mt-2">{t(analysis.tactic)}</p>
              )}
            </div>

            <motion.div
              className="py-3 px-4 rounded-lg text-center font-bold tracking-widest text-sm"
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
              ▓▓ {t(analysis.action).toUpperCase()} ▓▓
            </motion.div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {t("oiPanel.selectSymbol")}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
