"use client"

import { motion } from "framer-motion"
import { Target, Info, TrendingUp, TrendingDown, Minus } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useLanguage } from "../context/LanguageContext"

interface SentimentData {
  long_short_ratio: number
  long_accounts_pct: number
  short_accounts_pct: number
  top_trader_ratio: number
  top_long_pct: number
  top_short_pct: number
  taker_volume_ratio: number
  taker_buy: number
  taker_sell: number
  sentiment_signal: "bullish" | "bearish" | "neutral"
}

interface EntryLevelsProps {
  data: {
    price: number
    ema20: number
    ema50: number
    ema200?: number
    poc: number
    vah: number
    val: number
  }
  sentiment?: SentimentData
  loading?: boolean
}

function SentimentMetricCard({
  title,
  value,
  subtitle,
  interpretation,
  signal,
  loading,
}: {
  title: string
  value: string
  subtitle: string
  interpretation: string
  signal: "bullish" | "bearish" | "neutral"
  loading?: boolean
}) {
  const iconColor =
    signal === "bullish"
      ? "text-emerald-500"
      : signal === "bearish"
      ? "text-rose-500"
      : "text-amber-500"

  const bgColor =
    signal === "bullish"
      ? "bg-emerald-500/10 border-emerald-500/20"
      : signal === "bearish"
      ? "bg-rose-500/10 border-rose-500/20"
      : "bg-amber-500/10 border-amber-500/20"

  const Icon =
    signal === "bullish"
      ? TrendingUp
      : signal === "bearish"
      ? TrendingDown
      : Minus

  if (loading) {
    return (
      <div className="border rounded-lg bg-card p-3 animate-pulse">
        <div className="h-4 bg-primary/20 rounded w-24 mb-2" />
        <div className="h-6 bg-primary/20 rounded w-16" />
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "border rounded-lg p-3 cursor-help transition-colors hover:opacity-80",
            bgColor
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {title}
            </span>
            <Icon className={cn("w-3.5 h-3.5", iconColor)} />
          </div>
          <div className="text-lg font-bold tabular-nums">{value}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1.5">
          <p className="font-bold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{interpretation}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function getSentimentInterpretation(
  type: "long_short" | "top_trader" | "taker",
  value: number
): { text: string; signal: "bullish" | "bearish" | "neutral" } {
  if (type === "long_short") {
    if (value > 1.5)
      return {
        text: "Сильное преобладание лонгистов (>1.5). Рынок перегрет — возможен short squeeze или коррекция. Толпа слишком оптимистична.",
        signal: "bearish",
      }
    if (value < 0.7)
      return {
        text: "Сильное преобладание шортистов (<0.7). Рынок пессимистичен — возможен отскок. Экстремальный страх часто сигнализирует о дне.",
        signal: "bullish",
      }
    return {
      text: "Баланс между лонгистами и шортистами (~1.0). Рынок нейтрален, нет явного перекоса. Ждите импульса.",
      signal: "neutral",
    }
  }

  if (type === "top_trader") {
    if (value > 2.0)
      return {
        text: "Топ-трейдеры сильно в лонге (>2.0). Институциональное бычье настроение. Крупные игроки накапливают позиции.",
        signal: "bullish",
      }
    if (value < 0.5)
      return {
        text: "Топ-трейдеры в шорте (<0.5). Институциональное медвежье настроение. Смарт-мани защищается от падения.",
        signal: "bearish",
      }
    return {
      text: "Топ-трейдеры нейтральны (~1.0). Нет чёткой институциональной направленности. Рынок в ожидании.",
      signal: "neutral",
    }
  }

  // taker
  if (value > 1.2)
    return {
      text: "Покупатели агрессивны (>1.2). Taker-buy доминирует — сильный спрос на рынке. Агрессивное поглощение ликвидности.",
      signal: "bullish",
    }
  if (value < 0.8)
    return {
      text: "Продавцы агрессивны (<0.8). Taker-sell доминирует — сильное давление. Капитуляция или распределение.",
      signal: "bearish",
    }
  return {
    text: "Баланс между покупателями и продавцами (~1.0). Нет агрессивной стороны. Рынок консолидируется.",
    signal: "neutral",
  }
}

export function EntryLevels({ data, sentiment, loading }: EntryLevelsProps) {
  const { t } = useLanguage()
  if (loading) {
    return (
      <div className="w-full h-full border-2 border-primary/30 rounded-lg bg-card p-6 font-mono">
        <div className="flex items-center gap-3 text-primary mb-6">
          <Target className="w-5 h-5 animate-pulse" />
          <span className="text-lg font-bold tracking-wider">SHORT TERM POINTS</span>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 bg-primary/20 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const price = data?.price || 0

  if (!price) {
    return (
      <div className="w-full h-full border-2 border-muted rounded-lg bg-card p-6 font-mono flex items-center justify-center">
        <span className="text-muted-foreground">Select symbol to view levels...</span>
      </div>
    )
  }

  // Calculate distance from price (percentage)
  const getDistance = (levelPrice: number) => {
    return ((levelPrice - price) / price) * 100
  }

  // Get color based on level type
  const getColor = (type: "resistance" | "support" | "neutral") => {
    if (type === "resistance") return "#ef4444"
    if (type === "support") return "#22c55e"
    return "#9ca3af"
  }

  // Determine types for EMA levels
  const ema20Type: "resistance" | "support" = data.ema20 > price ? "resistance" : "support"
  const ema50Type: "resistance" | "support" = data.ema50 > price ? "resistance" : "support"

  // Find min/max for scale normalization
  const allValues = [data.vah, data.poc, price, data.ema20, data.ema50, data.val]
  const minValue = Math.min(...allValues) * 0.998
  const maxValue = Math.max(...allValues) * 1.002
  const range = maxValue - minValue

  // Normalize value to 0-100 scale
  const normalize = (value: number) => {
    return ((value - minValue) / range) * 100
  }

  const pricePosition = normalize(price)

  // All levels with descriptions (PRICE removed - shown as marker on scales)
  const levels = [
    {
      name: "VAH",
      value: data.vah,
      type: "resistance" as const,
      label: t("entryLevels.valueAreaHigh"),
      desc: "Верхняя граница зоны стоимости. Уровень сопротивления где цена считается \"дорогой\" (верхние 15% объема)",
    },
    {
      name: "POC",
      value: data.poc,
      type: "neutral" as const,
      label: t("entryLevels.pointOfControl"),
      desc: "Точка контроля - уровень с максимальным объемом торгов. Самая \"справедливая\" цена по мнению рынка",
    },
    {
      name: "EMA20",
      value: data.ema20,
      type: ema20Type,
      label: "EMA 20",
      desc: "Экспоненциальная скользящая средняя 20 периодов. Динамическая поддержка/сопротивление",
    },
    {
      name: "EMA50",
      value: data.ema50,
      type: ema50Type,
      label: "EMA 50",
      desc: "Экспоненциальная скользящая средняя 50 периодов. Определяет среднесрочный тренд",
    },
    {
      name: "VAL",
      value: data.val,
      type: "support" as const,
      label: t("entryLevels.valueAreaLow"),
      desc: "Нижняя граница зоны стоимости. Уровень поддержки где цена считается \"дешевой\" (нижние 15% объема)",
    },
  ].sort((a, b) => b.value - a.value)

  // Sentiment metrics
  const lsInterp = sentiment
    ? getSentimentInterpretation("long_short", sentiment.long_short_ratio)
    : null
  const ttInterp = sentiment
    ? getSentimentInterpretation("top_trader", sentiment.top_trader_ratio)
    : null
  const takerInterp = sentiment
    ? getSentimentInterpretation("taker", sentiment.taker_volume_ratio)
    : null

  return (
    <TooltipProvider delayDuration={100}>
      <motion.div
        className="w-full border-2 rounded-xl bg-card p-4 font-mono"
        style={{ borderColor: "#3b82f660" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-blue-500/40">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-blue-500" />
            <span className="text-xl font-bold tracking-widest text-blue-500">
              {t("entryLevels.shortTermPoints")}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">
                <strong>VAH/VAL</strong> — {t("entryLevels.vahValDescription")}
                <br />
                <strong>POC</strong> — {t("entryLevels.pocDescription")}
                <br />
                <strong>EMA</strong> — {t("entryLevels.emaDescription")}
                <br />
                <strong>Sentiment</strong> — {t("entryLevels.sentimentDescription")}
                <br />
                {t("entryLevels.tooltipPrefix")}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Sentiment Metrics */}
        {sentiment && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <SentimentMetricCard
              title={t("entryLevels.longShortRatio")}
              value={sentiment.long_short_ratio.toFixed(2)}
              subtitle={`Long: ${sentiment.long_accounts_pct.toFixed(1)}% · Short: ${sentiment.short_accounts_pct.toFixed(1)}%`}
              interpretation={lsInterp?.text || ""}
              signal={lsInterp?.signal || "neutral"}
              loading={loading}
            />
            <SentimentMetricCard
              title={t("entryLevels.topTraderLs")}
              value={sentiment.top_trader_ratio.toFixed(2)}
              subtitle={`Long: ${sentiment.top_long_pct.toFixed(1)}% · Short: ${sentiment.top_short_pct.toFixed(1)}%`}
              interpretation={ttInterp?.text || ""}
              signal={ttInterp?.signal || "neutral"}
              loading={loading}
            />
            <SentimentMetricCard
              title={t("entryLevels.takerBuySell")}
              value={sentiment.taker_volume_ratio.toFixed(2)}
              subtitle={
                sentiment.sentiment_signal === "bullish"
                  ? t("entryLevels.bullishDominance")
                  : sentiment.sentiment_signal === "bearish"
                  ? t("entryLevels.bearishDominance")
                  : t("entryLevels.neutralBalance")
              }
              interpretation={takerInterp?.text || ""}
              signal={takerInterp?.signal || "neutral"}
              loading={loading}
            />
          </div>
        )}

        {/* Levels */}
        <div className="space-y-2">
          {levels.map((level, index) => {
            const distance = getDistance(level.value)
            const color = getColor(level.type)
            const position = normalize(level.value)
            const isAbove = distance > 0

            return (
              <Tooltip key={level.name}>
                <TooltipTrigger asChild>
                  <motion.div
                    className="flex items-center gap-3 p-2 rounded-lg cursor-help transition-colors hover:bg-muted"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    {/* Name */}
                    <span className="text-sm font-bold w-14 shrink-0" style={{ color }}>
                      {level.name}
                    </span>

                    {/* SVG Scale with price marker */}
                    <div className="flex-1 relative h-6">
                      <svg className="w-full h-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                        {/* Background track */}
                        <rect x="0" y="3" width="100" height="4" rx="2" fill="#1f2937" />

                        {/* Filled portion based on position */}
                        <rect
                          x="0"
                          y="3"
                          width={position}
                          height="4"
                          rx="2"
                          fill={color}
                          opacity={0.6}
                        />

                        {/* Price marker line for all levels */}
                        <line
                          x1={pricePosition}
                          y1="0"
                          x2={pricePosition}
                          y2="10"
                          stroke="#fbbf24"
                          strokeWidth="1.5"
                          strokeDasharray="2,1"
                        />

                        {/* Current level indicator dot */}
                        <circle cx={position} cy="5" r={2.5} fill={color} />
                      </svg>

                      {/* Price label positioned on scale */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold px-1 rounded whitespace-nowrap"
                        style={{
                          left: `${position}%`,
                          transform: "translateX(-50%) translateY(-50%)",
                          color: color,
                          backgroundColor: "rgba(0,0,0,0.7)",
                          textShadow: "0 0 4px rgba(0,0,0,0.8)",
                        }}
                      >
                        {/* Dynamic formatting based on price magnitude */}
                        {(() => {
                          const v = level.value
                          if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
                          if (v >= 1) return `$${v.toFixed(2)}`
                          if (v >= 0.01) return `$${v.toFixed(4)}`
                          return `$${v.toFixed(6)}`
                        })()}
                      </div>
                    </div>

                    {/* Distance */}
                    <span className="text-xs w-14 text-right font-mono text-muted-foreground">
                      {distance > 0 ? "+" : ""}
                      {distance.toFixed(1)}%
                    </span>

                    {/* Indicator */}
                    <span className="text-lg shrink-0 w-6 text-center">
                      {level.type === "resistance" ? "🔴" : level.type === "support" ? "🟢" : "⚪"}
                    </span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-sm" style={{ color }}>
                      {level.label}:{" "}
                      {(() => {
                        const v = level.value
                        if (v >= 1000)
                          return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        if (v >= 1) return `$${v.toFixed(2)}`
                        if (v >= 0.01) return `$${v.toFixed(4)}`
                        return `$${v.toFixed(6)}`
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground">{level.desc}</p>
                    <p className="text-xs">
                      {isAbove
                        ? `На ${distance.toFixed(1)}% выше текущей цены`
                        : `На ${Math.abs(distance).toFixed(1)}% ниже текущей цены`}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-muted-foreground/20">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>🔴 Resistance</span>
            <span>🟢 Support</span>
            <span>⚪ Neutral</span>
            <span>🎯 Current</span>
          </div>
          {/* Price scale legend */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <div className="flex-1 h-1 bg-gradient-to-r from-green-900/50 via-gray-800 to-red-900/50 rounded-full relative">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2 bg-yellow-500"
                style={{ left: `${pricePosition}%` }}
              />
            </div>
            <span>▲ — текущая цена на шкале</span>
          </div>
        </div>

        {/* Note: Trading Plan removed — no backtested strategy to recommend */}
      </motion.div>
    </TooltipProvider>
  )
}
