"use client"

import { motion } from "framer-motion"
import { Activity } from "lucide-react"

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

// Colors
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

// Create arc path for sector
function createArcPath(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(centerX, centerY, radius, endAngle)
  const end = polarToCartesian(centerX, centerY, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ")
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  }
}

// Get angle for value in sector (maps -1 to 1 to sector range)
function getSectorAngle(sectorStart: number, sectorEnd: number, value: number): number {
  const normalized = Math.max(-1, Math.min(1, value))
  const sectorRange = sectorEnd - sectorStart
  const midPoint = sectorStart + sectorRange / 2
  return midPoint + (normalized * sectorRange / 2)
}

// Get color based on position in sector
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

  // Parse directions to values (-1 to 1)
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

  // Sector definitions
  const sectors = {
    volume: { start: 10, end: 130, label: "VOLUME" },
    oi: { start: 130, end: 250, label: "OI" },
    price: { start: 250, end: 370, label: "PRICE" }
  }

  const volumeAngle = getSectorAngle(sectors.volume.start, sectors.volume.end, volumeValue)
  const oiAngle = getSectorAngle(sectors.oi.start, sectors.oi.end, oiValue)
  const priceAngle = getSectorAngle(sectors.price.start, sectors.price.end, priceValue)

  const volumeColor = getSectorColor(volumeAngle, sectors.volume.start, sectors.volume.end)
  const oiColor = getSectorColor(oiAngle, sectors.oi.start, sectors.oi.end)
  const priceColor = getSectorColor(priceAngle, sectors.price.start, sectors.price.end)

  const cx = 200
  const cy = 200
  const radius = 150

  const signalColor = analysis?.color || COLORS.gray
  const isBullish = signalColor === COLORS.green || analysis?.signal?.includes("bullish")
  const isBearish = signalColor === COLORS.red || analysis?.signal?.includes("bearish")
  const glowColor = isBullish ? COLORS.glowGreen : isBearish ? COLORS.glowRed : COLORS.glowGray

  return (
    <div className="flex flex-col items-center">
      {/* Speedometer Container */}
      <div className="relative w-[400px] h-[400px] max-w-full">
        {/* Outer glow effect */}
        <div 
          className="absolute inset-0 rounded-full transition-all duration-500"
          style={{ 
            boxShadow: `0 0 60px ${glowColor}, inset 0 0 40px rgba(0,0,0,0.5)`,
            border: `3px solid ${isBullish ? COLORS.green : isBearish ? COLORS.red : COLORS.gray}40`
          }}
        />
        
        {/* Main SVG */}
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
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background circle */}
          <circle cx={cx} cy={cy} r={radius + 10} fill="url(#darkBg)" stroke="#1a1a24" strokeWidth="2" />
          
          {/* Chrome outer ring */}
          <circle cx={cx} cy={cy} r={radius + 8} fill="none" stroke="url(#chrome)" strokeWidth="4" />
          <circle cx={cx} cy={cy} r={radius + 2} fill="none" stroke="#333" strokeWidth="1" />

          {/* Volume Sector - Red/Gray/Green zones */}
          <path d={createArcPath(cx, cy, radius, sectors.volume.start, sectors.volume.start + 40)} 
                fill="none" stroke={COLORS.red} strokeWidth="25" opacity="0.9" />
          <path d={createArcPath(cx, cy, radius, sectors.volume.start + 40, sectors.volume.start + 80)} 
                fill="none" stroke={COLORS.gray} strokeWidth="25" opacity="0.8" />
          <path d={createArcPath(cx, cy, radius, sectors.volume.start + 80, sectors.volume.end)} 
                fill="none" stroke={COLORS.green} strokeWidth="25" opacity="0.9" />

          {/* OI Sector */}
          <path d={createArcPath(cx, cy, radius, sectors.oi.start, sectors.oi.start + 40)} 
                fill="none" stroke={COLORS.red} strokeWidth="25" opacity="0.9" />
          <path d={createArcPath(cx, cy, radius, sectors.oi.start + 40, sectors.oi.start + 80)} 
                fill="none" stroke={COLORS.gray} strokeWidth="25" opacity="0.8" />
          <path d={createArcPath(cx, cy, radius, sectors.oi.start + 80, sectors.oi.end)} 
                fill="none" stroke={COLORS.green} strokeWidth="25" opacity="0.9" />

          {/* Price Sector */}
          <path d={createArcPath(cx, cy, radius, sectors.price.start, sectors.price.start + 40)} 
                fill="none" stroke={COLORS.red} strokeWidth="25" opacity="0.9" />
          <path d={createArcPath(cx, cy, radius, sectors.price.start + 40, sectors.price.start + 80)} 
                fill="none" stroke={COLORS.gray} strokeWidth="25" opacity="0.8" />
          <path d={createArcPath(cx, cy, radius, sectors.price.start + 80, sectors.price.end)} 
                fill="none" stroke={COLORS.green} strokeWidth="25" opacity="0.9" />

          {/* Chrome divider lines */}
          {[sectors.volume.start, sectors.volume.end, sectors.oi.end].map((angle, i) => {
            const pos = polarToCartesian(cx, cy, radius + 10, angle)
            const innerPos = polarToCartesian(cx, cy, radius - 25, angle)
            return (
              <line key={i} x1={innerPos.x} y1={innerPos.y} x2={pos.x} y2={pos.y} 
                    stroke="url(#chrome)" strokeWidth="3" />
            )
          })}

          {/* Sector Labels */}
          {[
            { angle: 70, label: "VOLUME" },
            { angle: 190, label: "OI" },
            { angle: 310, label: "PRICE" }
          ].map(({ angle, label }) => {
            const pos = polarToCartesian(cx, cy, radius - 45, angle)
            return (
              <text key={label} x={pos.x} y={pos.y} textAnchor="middle" fill="#9ca3af" 
                    fontSize="11" fontWeight="bold" letterSpacing="2">
                {label}
              </text>
            )
          })}

          {/* Zone indicators */}
          {[
            { sector: sectors.volume, symbols: ["↓", "→", "↑"] },
            { sector: sectors.oi, symbols: ["↓", "→", "↑"] },
            { sector: sectors.price, symbols: ["↓", "→", "↑"] }
          ].map(({ sector, symbols }, sectorIdx) => {
            const zoneSize = (sector.end - sector.start) / 3
            return symbols.map((symbol, i) => {
              const angle = sector.start + zoneSize * i + zoneSize / 2
              const pos = polarToCartesian(cx, cy, radius - 18, angle)
              return (
                <text key={`${sectorIdx}-${i}`} x={pos.x} y={pos.y} textAnchor="middle" 
                      fill="rgba(0,0,0,0.6)" fontSize="12" fontWeight="bold">
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
              const outer = polarToCartesian(cx, cy, radius + 2, angle)
              const inner = polarToCartesian(cx, cy, radius - 2, angle)
              return (
                <line key={`${idx}-${i}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                      stroke="#666" strokeWidth="2" />
              )
            })
          })}

          {/* Volume Needle - longest */}
          <motion.g
            initial={{ rotate: sectors.volume.start + 20 }}
            animate={{ rotate: volumeAngle }}
            transition={{ type: "spring", stiffness: 60, damping: 12 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <polygon 
              points={`${cx-3},${cy} ${cx},${cy-115} ${cx+3},${cy}`}
              fill={volumeColor}
              filter={volumeColor === COLORS.green ? "url(#glow-green)" : volumeColor === COLORS.red ? "url(#glow-red)" : ""}
            />
            <circle cx={cx} cy={cy} r="5" fill={volumeColor} />
          </motion.g>

          {/* OI Needle - medium */}
          <motion.g
            initial={{ rotate: sectors.oi.start + 20 }}
            animate={{ rotate: oiAngle }}
            transition={{ type: "spring", stiffness: 60, damping: 12, delay: 0.1 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <polygon 
              points={`${cx-3},${cy} ${cx},${cy-105} ${cx+3},${cy}`}
              fill={oiColor}
              filter={oiColor === COLORS.green ? "url(#glow-green)" : oiColor === COLORS.red ? "url(#glow-red)" : ""}
            />
            <circle cx={cx} cy={cy} r="5" fill={oiColor} />
          </motion.g>

          {/* Price Needle - shortest */}
          <motion.g
            initial={{ rotate: sectors.price.start + 20 }}
            animate={{ rotate: priceAngle }}
            transition={{ type: "spring", stiffness: 60, damping: 12, delay: 0.2 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <polygon 
              points={`${cx-3},${cy} ${cx},${cy-95} ${cx+3},${cy}`}
              fill={priceColor}
              filter={priceColor === COLORS.green ? "url(#glow-green)" : priceColor === COLORS.red ? "url(#glow-red)" : ""}
            />
            <circle cx={cx} cy={cy} r="5" fill={priceColor} />
          </motion.g>

          {/* CENTER HUB */}
          <circle cx={cx} cy={cy} r="55" fill="url(#darkBg)" stroke="url(#chrome)" strokeWidth="3" />
          <circle cx={cx} cy={cy} r="50" fill="#111118" stroke="#333" strokeWidth="1" />
          <circle cx={cx} cy={cy} r="45" fill={signalColor} opacity="0.1" />
          <circle cx={cx} cy={cy} r="40" fill={signalColor} opacity="0.05" />

          {/* Signal Text in center */}
          {analysis && (
            <>
              <text x={cx} y={cy - 8} textAnchor="middle" fill={signalColor} 
                    fontSize="13" fontWeight="bold" letterSpacing="1">
                {analysis.status?.replace(/_/g, " ").toUpperCase()}
              </text>
              
              <text x={cx} y={cy + 12} textAnchor="middle" fill={signalColor} fontSize="16">
                {isBullish ? "↑↑↑" : isBearish ? "↓↓↓" : "→→→"}
              </text>
              
              <text x={cx} y={cy + 26} textAnchor="middle" fill="#9ca3af" fontSize="8">
                {analysis.signal?.includes("strong") ? "Сильный сигнал" : 
                 analysis.signal?.includes("weak") ? "Слабый сигнал" : "Нейтрально"}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Text Panel Below */}
      {analysis && (
        <motion.div 
          className="w-full max-w-[400px] mt-4 space-y-3"
          initial={{ opacity: 0, y: 20 }}
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

          {/* Action & Confidence */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(17, 17, 24, 0.6)" }}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Рекомендация</p>
              <p className="text-sm font-bold" style={{ color: signalColor }}>{analysis.action}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(17, 17, 24, 0.6)" }}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Уверенность</p>
              <p className="text-sm font-bold">{analysis.strength * 20}%</p>
            </div>
          </div>

          {analysis.tactic && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(17, 17, 24, 0.6)" }}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Тактика</p>
              <p className="text-sm text-muted-foreground">{analysis.tactic}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
