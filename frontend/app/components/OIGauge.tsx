"use client"

import { motion } from "framer-motion"
import { Activity, BarChart3, DollarSign } from "lucide-react"

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
  price_direction?: "up" | "down" | "flat"
  volume_status?: "high" | "low" | "neutral"
  oi_change_pct?: number
  price_change_pct?: number
  volume_change_pct?: number
}

interface OIGaugeProps {
  analysis: OIAnalysis | null
  loading?: boolean
}

// Gauge component for single metric
function Gauge({
  label,
  icon: Icon,
  direction,
  value,
  sublabel
}: {
  label: string
  icon: React.ElementType
  direction: "up" | "down" | "flat" | "high" | "low" | "neutral"
  value?: string
  sublabel?: string
}) {
  // Map direction to angle (-90 to 90 degrees)
  const getAngle = () => {
    switch (direction) {
      case "up":
      case "high":
        return 60 // Right side (green zone)
      case "down":
      case "low":
        return -60 // Left side (red zone)
      case "flat":
      case "neutral":
      default:
        return 0 // Center (gray zone)
    }
  }

  const angle = getAngle()
  const isUp = direction === "up" || direction === "high"
  const isDown = direction === "down" || direction === "low"
  const isFlat = direction === "flat" || direction === "neutral"

  // Colors
  const greenColor = "#22c55e"
  const redColor = "#ef4444"
  const grayColor = "#6b7280"
  const needleColor = isUp ? greenColor : isDown ? redColor : grayColor

  return (
    <div className="flex flex-col items-center">
      {/* Gauge Container */}
      <div className="relative w-36 h-24">
        {/* SVG Gauge */}
        <svg viewBox="0 0 144 80" className="w-full h-full">
          {/* Background arc - Gray zone (center) */}
          <path
            d="M 20 76 A 52 52 0 0 1 124 76"
            fill="none"
            stroke="#374151"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Red zone - Left side (Down/Fall) */}
          <path
            d="M 20 76 A 52 52 0 0 1 52 28"
            fill="none"
            stroke={redColor}
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.9"
          />
          
          {/* Green zone - Right side (Up/Rise) */}
          <path
            d="M 92 28 A 52 52 0 0 1 124 76"
            fill="none"
            stroke={greenColor}
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Tick marks */}
          {[-60, -30, 0, 30, 60].map((tickAngle, i) => {
            const rad = ((tickAngle - 90) * Math.PI) / 180
            const x1 = 72 + Math.cos(rad) * 38
            const y1 = 76 + Math.sin(rad) * 38
            const x2 = 72 + Math.cos(rad) * 46
            const y2 = 76 + Math.sin(rad) * 46
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#9ca3af"
                strokeWidth="2"
              />
            )
          })}

          {/* Zone labels */}
          <text x="28" y="72" fontSize="8" fill="#9ca3af" textAnchor="middle">↓</text>
          <text x="72" y="28" fontSize="8" fill="#9ca3af" textAnchor="middle">→</text>
          <text x="116" y="72" fontSize="8" fill="#9ca3af" textAnchor="middle">↑</text>

          {/* Animated Needle */}
          <motion.g
            initial={{ rotate: -60 }}
            animate={{ rotate: angle }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            style={{ transformOrigin: "72px 76px" }}
          >
            {/* Needle */}
            <polygon
              points="72,76 68,20 72,14 76,20"
              fill={needleColor}
              stroke={needleColor}
              strokeWidth="1"
            />
            {/* Glow effect */}
            <circle cx="72" cy="76" r="6" fill={needleColor} opacity="0.3" />
          </motion.g>

          {/* Center pivot */}
          <circle cx="72" cy="76" r="4" fill="#1f2937" stroke={needleColor} strokeWidth="2" />
        </svg>

        {/* Icon badge */}
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center border-2"
          style={{ 
            backgroundColor: needleColor + "20",
            borderColor: needleColor,
            color: needleColor
          }}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Label */}
      <div className="mt-4 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-bold" style={{ color: needleColor }}>
          {isUp ? "Рост" : isDown ? "Падение" : "Боковик"}
        </p>
        {value && <p className="text-xs text-muted-foreground">{value}</p>}
        {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  )
}

export function OIGauge({ analysis, loading }: OIGaugeProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80">
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-36 h-24 rounded-full border-4 border-primary/20 animate-pulse" />
          ))}
        </div>
        <p className="mt-8 text-muted-foreground">Analyzing market...</p>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
        <div className="flex gap-4 mb-4">
          <Gauge label="OI" icon={BarChart3} direction="flat" />
          <Gauge label="Price" icon={DollarSign} direction="flat" />
          <Gauge label="Volume" icon={Activity} direction="neutral" />
        </div>
        <p>Select a symbol to view analysis</p>
      </div>
    )
  }

  // Parse directions
  const desc = analysis.description?.toLowerCase() || ""
  
  const getDirection = (type: "oi" | "price" | "volume") => {
    if (type === "oi") {
      if (desc.includes("oi↑") || desc.includes("oi растет")) return "up"
      if (desc.includes("oi↓") || desc.includes("oi падает")) return "down"
      return "flat"
    }
    if (type === "price") {
      if (desc.includes("цена↑") || desc.includes("цена растет")) return "up"
      if (desc.includes("цена↓") || desc.includes("цена падает")) return "down"
      return "flat"
    }
    if (type === "volume") {
      if (desc.includes("объем↑") || desc.includes("высокий")) return "high"
      if (desc.includes("объем↓") || desc.includes("низкий")) return "low"
      return "neutral"
    }
    return "flat"
  }

  const oiDir = analysis.oi_direction || getDirection("oi")
  const priceDir = analysis.price_direction || getDirection("price")
  const volumeStat = analysis.volume_status || getDirection("volume")

  const formatPct = (val?: number) => val ? `${val >= 0 ? "+" : ""}${val.toFixed(2)}%` : undefined

  return (
    <div className="flex flex-col items-center">
      {/* Three Gauges */}
      <div className="flex justify-center gap-2 sm:gap-6 mb-6">
        <Gauge
          label="OI"
          icon={BarChart3}
          direction={oiDir}
          value={formatPct(analysis.oi_change_pct)}
        />
        <Gauge
          label="Price"
          icon={DollarSign}
          direction={priceDir}
          value={formatPct(analysis.price_change_pct)}
        />
        <Gauge
          label="Volume"
          icon={Activity}
          direction={volumeStat}
          sublabel={volumeStat === "high" ? "Высокий" : volumeStat === "low" ? "Низкий" : "Средний"}
        />
      </div>

      {/* Combined Signal Indicator */}
      <motion.div 
        className="w-full max-w-sm mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div 
          className="text-center py-2 px-4 rounded-full font-bold text-sm uppercase tracking-wider"
          style={{ 
            backgroundColor: analysis.color + "30",
            border: `2px solid ${analysis.color}`,
            color: analysis.color
          }}
        >
          {analysis.status?.replace(/_/g, " ").toUpperCase()}
        </div>
      </motion.div>

      {/* Text Interpretation Panel */}
      <motion.div 
        className="w-full space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {/* Main Description */}
        <div 
          className="p-4 rounded-xl"
          style={{ 
            backgroundColor: analysis.color + "10",
            borderLeft: `4px solid ${analysis.color}`
          }}
        >
          <p className="font-medium text-foreground leading-relaxed">
            {analysis.description}
          </p>
          {analysis.detailed && (
            <p className="text-sm text-muted-foreground mt-2">
              {analysis.detailed}
            </p>
          )}
        </div>

        {/* Action Box */}
        <div className="bg-muted rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Действие:</span>
            <span className="text-sm">{analysis.action}</span>
          </div>
          {analysis.tactic && (
            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-foreground shrink-0">Тактика:</span>
              <span className="text-sm text-muted-foreground">{analysis.tactic}</span>
            </div>
          )}
        </div>

        {/* Signal Strength */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Сила сигнала:</span>
          <div className="flex gap-1 flex-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <motion.div
                key={level}
                className="h-2 flex-1 rounded-full"
                style={{
                  backgroundColor: level <= analysis.strength ? analysis.color : "hsl(var(--muted))"
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3, delay: 0.6 + level * 0.1 }}
              />
            ))}
          </div>
          <span className="text-xs font-bold" style={{ color: analysis.color }}>
            {analysis.strength}/5
          </span>
        </div>
      </motion.div>
    </div>
  )
}
