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
}

interface OISpeedometerProps {
  analysis: OIAnalysis | null
  loading?: boolean
}

const COLORS = {
  green: "#10b981",
  gray: "#64748b", 
  red: "#ef4444",
  chrome: "#c0c0c0",
  darkBg: "#0a0a0f",
  glowGreen: "rgba(16, 185, 129, 0.4)",
  glowRed: "rgba(239, 68, 68, 0.4)",
  glowGray: "rgba(100, 116, 139, 0.3)"
}

function createArcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ")
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  }
}

function getSectorAngle(sectorStart: number, sectorEnd: number, value: number): number {
  const normalized = Math.max(-1, Math.min(1, value))
  const sectorRange = sectorEnd - sectorStart
  const midPoint = sectorStart + sectorRange / 2
  return midPoint + (normalized * sectorRange / 2)
}

function getSectorColor(angle: number, sectorStart: number, sectorEnd: number): string {
  const sectorRange = sectorEnd - sectorStart
  const relativePos = (angle - sectorStart) / sectorRange
  if (relativePos < 0.33) return COLORS.red
  if (relativePos > 0.66) return COLORS.green
  return COLORS.gray
}

export function OISpeedometer({ analysis, loading }: OISpeedometerProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px]">
        <div className="w-80 h-80 rounded-full border-4 border-primary/20 animate-pulse flex items-center justify-center">
          <Activity className="w-12 h-12 text-muted-foreground animate-spin" />
        </div>
      </div>
    )
  }

  const desc = analysis?.description?.toLowerCase() || ""
  
  const getValue = (type: "oi" | "price" | "volume"): number => {
    if (!analysis) return 0
    if (type === "oi") {
      const dir = analysis.oi_direction || (desc.includes("oi↑") ? "up" : desc.includes("oi↓") ? "down" : "flat")
      return dir === "up" ? 1 : dir === "down" ? -1 : 0
    }
    if (type === "price") {
      const dir = analysis.price_direction || (desc.includes("цена↑") ? "up" : desc.includes("цена↓") ? "down" : "flat")
      return dir === "up" ? 1 : dir === "down" ? -1 : 0
    }
    if (type === "volume") {
      const stat = analysis.volume_status || (desc.includes("объем↑") ? "high" : desc.includes("объем↓") ? "low" : "neutral")
      return stat === "high" ? 1 : stat === "low" ? -1 : 0
    }
    return 0
  }

  const volumeValue = getValue("volume")
  const oiValue = getValue("oi")
  const priceValue = getValue("price")

  const sectors = {
    volume: { start: 10, end: 130, label: "VOLUME", icon: Activity },
    oi: { start: 130, end: 250, label: "OI", icon: BarChart3 },
    price: { start: 250, end: 370, label: "PRICE", icon: DollarSign }
  }

  const volumeAngle = getSectorAngle(sectors.volume.start, sectors.volume.end, volumeValue)
  const oiAngle = getSectorAngle(sectors.oi.start, sectors.oi.end, oiValue)
  const priceAngle = getSectorAngle(sectors.price.start, sectors.price.end, priceValue)

  const volumeColor = getSectorColor(volumeAngle, sectors.volume.start, sectors.volume.end)
  const oiColor = getSectorColor(oiAngle, sectors.oi.start, sectors.oi.end)
  const priceColor = getSectorColor(priceAngle, sectors.price.start, sectors.price.end)

  const cx = 200
  const cy = 200
  const radius = 140

  const signalColor = analysis?.color || COLORS.gray
  const isBullish = signalColor === COLORS.green || analysis?.signal?.includes("bullish")
  const isBearish = signalColor === COLORS.red || analysis?.signal?.includes("bearish")
  const glowColor = isBullish ? COLORS.glowGreen : isBearish ? COLORS.glowRed : COLORS.glowGray

  return (
    <div className="flex flex-col items-center">
      {/* TEXT PANEL - ABOVE */}
      {analysis && (
        <motion.div 
          className="w-full max-w-[420px] mb-4 space-y-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Description Block */}
          <div 
            className="p-4 rounded-xl backdrop-blur-sm"
            style={{ 
              backgroundColor: "rgba(17, 17, 24, 0.8)",
              border: `1px solid ${signalColor}40`,
              boxShadow: `0 0 20px ${glowColor}`
            }}
          >
            <p className="font-medium text-foreground leading-relaxed text-sm">
              {analysis.description}
            </p>
            {analysis.detailed && (
              <p className="text-xs text-muted-foreground mt-2">
                {analysis.detailed}
              </p>
            )}
          </div>

          {/* Action */}
          <div className="p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: "rgba(17, 17, 24, 0.6)" }}>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Рекомендация</span>
            <span className="text-sm font-bold" style={{ color: signalColor }}>{analysis.action}</span>
          </div>

          {analysis.tactic && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(17, 17, 24, 0.6)" }}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Тактика</p>
              <p className="text-sm text-muted-foreground">{analysis.tactic}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* SPEEDOMETER */}
      <div className="relative w-[420px] h-[420px] max-w-full">
        {/* Outer glow */}
        <div 
          className="absolute inset-0 rounded-full transition-all duration-500"
          style={{ 
            boxShadow: `0 0 60px ${glowColor}, inset 0 0 40px rgba(0,0,0,0.5)`,
            border: `3px solid ${isBullish ? COLORS.green : isBearish ? COLORS.red : COLORS.gray}40`
          }}
        />
        
        <svg viewBox="0 0 400 400" className="w-full h-full">
          <defs>
            <linearGradient id="chrome" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e8e8e8" />
              <stop offset="50%" stopColor="#a0a0a0" />
              <stop offset="100%" stopColor="#e8e8e8" />
            </linearGradient>
            <radialGradient id="darkBg" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#111118" />
              <stop offset="100%" stopColor="#0a0a0f" />
            </radialGradient>
            <filter id="glow-green">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <circle cx={cx} cy={cy} r={radius + 35} fill="url(#darkBg)" stroke="#1a1a24" strokeWidth="2" />
          <circle cx={cx} cy={cy} r={radius + 30} fill="none" stroke="url(#chrome)" strokeWidth="4" />
          
          {/* Metric Labels OUTSIDE on the rim */}
          {[
            { angle: 70, label: "VOLUME", icon: Activity },
            { angle: 190, label: "OI", icon: BarChart3 },
            { angle: 310, label: "PRICE", icon: DollarSign }
          ].map(({ angle, label, icon: Icon }) => {
            const pos = polarToCartesian(cx, cy, radius + 50, angle)
            const iconPos = polarToCartesian(cx, cy, radius + 22, angle)
            return (
              <g key={label}>
                {/* Label text */}
                <text 
                  x={pos.x} 
                  y={pos.y} 
                  textAnchor="middle" 
                  fill="#e5e7eb" 
                  fontSize="14" 
                  fontWeight="bold" 
                  letterSpacing="3"
                  style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}
                >
                  {label}
                </text>
                {/* Icon */}
                <foreignObject x={iconPos.x - 10} y={iconPos.y - 10} width="20" height="20">
                  <div className="flex items-center justify-center w-5 h-5 text-muted-foreground">
                    <Icon className="w-4 h-4" />
                  </div>
                </foreignObject>
              </g>
            )
          })}

          {/* Main gauge ring */}
          <circle cx={cx} cy={cy} r={radius + 5} fill="none" stroke="#333" strokeWidth="2" />

          {/* Volume Sector (10-130°) */}
          <path d={createArcPath(cx, cy, radius, sectors.volume.start, sectors.volume.start + 40)} 
                fill="none" stroke={COLORS.red} strokeWidth="35" opacity="0.9" />
          <path d={createArcPath(cx, cy, radius, sectors.volume.start + 40, sectors.volume.start + 80)} 
                fill="none" stroke={COLORS.gray} strokeWidth="35" opacity="0.8" />
          <path d={createArcPath(cx, cy, radius, sectors.volume.start + 80, sectors.volume.end)} 
                fill="none" stroke={COLORS.green} strokeWidth="35" opacity="0.9" />

          {/* OI Sector (130-250°) */}
          <path d={createArcPath(cx, cy, radius, sectors.oi.start, sectors.oi.start + 40)} 
                fill="none" stroke={COLORS.red} strokeWidth="35" opacity="0.9" />
          <path d={createArcPath(cx, cy, radius, sectors.oi.start + 40, sectors.oi.start + 80)} 
                fill="none" stroke={COLORS.gray} strokeWidth="35" opacity="0.8" />
          <path d={createArcPath(cx, cy, radius, sectors.oi.start + 80, sectors.oi.end)} 
                fill="none" stroke={COLORS.green} strokeWidth="35" opacity="0.9" />

          {/* Price Sector (250-370°) */}
          <path d={createArcPath(cx, cy, radius, sectors.price.start, sectors.price.start + 40)} 
                fill="none" stroke={COLORS.red} strokeWidth="35" opacity="0.9" />
          <path d={createArcPath(cx, cy, radius, sectors.price.start + 40, sectors.price.start + 80)} 
                fill="none" stroke={COLORS.gray} strokeWidth="35" opacity="0.8" />
          <path d={createArcPath(cx, cy, radius, sectors.price.start + 80, sectors.price.end)} 
                fill="none" stroke={COLORS.green} strokeWidth="35" opacity="0.9" />

          {/* Chrome dividers */}
          {[sectors.volume.start, sectors.volume.end, sectors.oi.end].map((angle, i) => {
            const pos = polarToCartesian(cx, cy, radius + 5, angle)
            const innerPos = polarToCartesian(cx, cy, radius - 30, angle)
            return (
              <line key={i} x1={innerPos.x} y1={innerPos.y} x2={pos.x} y2={pos.y} 
                    stroke="url(#chrome)" strokeWidth="4" />
            )
          })}

          {/* Zone symbols */}
          {[
            { sector: sectors.volume, symbols: ["↓", "→", "↑"] },
            { sector: sectors.oi, symbols: ["↓", "→", "↑"] },
            { sector: sectors.price, symbols: ["↓", "→", "↑"] }
          ].map(({ sector, symbols }, sectorIdx) => {
            const zoneSize = (sector.end - sector.start) / 3
            return symbols.map((symbol, i) => {
              const angle = sector.start + zoneSize * i + zoneSize / 2
              const pos = polarToCartesian(cx, cy, radius - 20, angle)
              return (
                <text key={`${sectorIdx}-${i}`} x={pos.x} y={pos.y} textAnchor="middle" 
                      fill="rgba(0,0,0,0.7)" fontSize="14" fontWeight="bold">
                  {symbol}
                </text>
              )
            })
          })}

          {/* Tick marks */}
          {[
            { sector: sectors.volume, count: 5 },
            { sector: sectors.oi, count: 5 },
            { sector: sectors.price, count: 5 }
          ].map(({ sector, count }, idx) => {
            const step = (sector.end - sector.start) / (count - 1)
            return Array.from({ length: count }, (_, i) => {
              const angle = sector.start + step * i
              const outer = polarToCartesian(cx, cy, radius + 3, angle)
              const inner = polarToCartesian(cx, cy, radius - 3, angle)
              return (
                <line key={`${idx}-${i}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                      stroke="#666" strokeWidth="3" />
              )
            })
          })}

          {/* BIG NEEDLES - Volume (longest) */}
          <motion.g
            initial={{ rotate: sectors.volume.start + 20 }}
            animate={{ rotate: volumeAngle }}
            transition={{ type: "spring", stiffness: 60, damping: 12 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <polygon 
              points={`${cx-5},${cy} ${cx},${cy-125} ${cx+5},${cy}`}
              fill={volumeColor}
              filter={volumeColor === COLORS.green ? "url(#glow-green)" : volumeColor === COLORS.red ? "url(#glow-red)" : ""}
            />
            <circle cx={cx} cy={cy} r="8" fill={volumeColor} />
          </motion.g>

          {/* OI Needle (medium) */}
          <motion.g
            initial={{ rotate: sectors.oi.start + 20 }}
            animate={{ rotate: oiAngle }}
            transition={{ type: "spring", stiffness: 60, damping: 12, delay: 0.1 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <polygon 
              points={`${cx-5},${cy} ${cx},${cy-115} ${cx+5},${cy}`}
              fill={oiColor}
              filter={oiColor === COLORS.green ? "url(#glow-green)" : oiColor === COLORS.red ? "url(#glow-red)" : ""}
            />
            <circle cx={cx} cy={cy} r="8" fill={oiColor} />
          </motion.g>

          {/* Price Needle (shortest) */}
          <motion.g
            initial={{ rotate: sectors.price.start + 20 }}
            animate={{ rotate: priceAngle }}
            transition={{ type: "spring", stiffness: 60, damping: 12, delay: 0.2 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <polygon 
              points={`${cx-5},${cy} ${cx},${cy-105} ${cx+5},${cy}`}
              fill={priceColor}
              filter={priceColor === COLORS.green ? "url(#glow-green)" : priceColor === COLORS.red ? "url(#glow-red)" : ""}
            />
            <circle cx={cx} cy={cy} r="8" fill={priceColor} />
          </motion.g>

          {/* Center Hub */}
          <circle cx={cx} cy={cy} r="65" fill="url(#darkBg)" stroke="url(#chrome)" strokeWidth="4" />
          <circle cx={cx} cy={cy} r="58" fill="#111118" stroke="#333" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="52" fill={signalColor} opacity="0.15" />
          <circle cx={cx} cy={cy} r="45" fill={signalColor} opacity="0.08" />

          {/* Center Signal Text */}
          {analysis && (
            <>
              <text x={cx} y={cy - 12} textAnchor="middle" fill={signalColor} 
                    fontSize="15" fontWeight="bold" letterSpacing="1"
                    style={{ textShadow: `0 0 10px ${signalColor}50` }}>
                {analysis.status?.replace(/_/g, " ").toUpperCase()}
              </text>
              
              <text x={cx} y={cy + 18} textAnchor="middle" fill={signalColor} fontSize="22" fontWeight="bold">
                {isBullish ? "↑↑↑" : isBearish ? "↓↓↓" : "→→→"}
              </text>
              
              <text x={cx} y={cy + 38} textAnchor="middle" fill="#9ca3af" fontSize="9">
                {analysis.signal?.includes("strong") ? "Сильный сигнал" : 
                 analysis.signal?.includes("weak") ? "Слабый сигнал" : "Нейтрально"}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
