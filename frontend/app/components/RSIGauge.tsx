"use client"

import { cn } from "@/lib/utils"

interface RSIGaugeProps {
  value: number
  label: string
  labelColorClass?: string
  className?: string
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = (Math.PI * (180 - angleDeg)) / 180
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy - r * Math.sin(angleRad),
  }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
  return [`M ${start.x} ${start.y}`, `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`].join(" ")
}

export function RSIGauge({ value, label, labelColorClass = "text-slate-400", className }: RSIGaugeProps) {
  const cx = 70
  const cy = 80
  const r = 50
  const strokeWidth = 12

  const zones = [
    { from: 0, to: 30, color: "#22c55e" },
    { from: 30, to: 45, color: "#86efac" },
    { from: 45, to: 55, color: "#6b7280" },
    { from: 55, to: 70, color: "#fca5a5" },
    { from: 70, to: 100, color: "#ef4444" },
  ]

  const needleAngle = Math.max(0, Math.min(100, value)) * 1.8
  const needleEnd = polarToCartesian(cx, cy, r - 4, needleAngle)

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width="140" height="88" viewBox="0 0 140 88">
        {/* Background track */}
        <path
          d={describeArc(cx, cy, r, 0, 180)}
          fill="none"
          stroke="#222"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Colored zones */}
        {zones.map((z, i) => (
          <path
            key={i}
            d={describeArc(cx, cy, r, z.from * 1.8, z.to * 1.8)}
            fill="none"
            stroke={z.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
        ))}
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Needle pivot */}
        <circle cx={cx} cy={cy} r="4" fill="white" />
      </svg>
      <div className="-mt-1 text-center">
        <div className="text-2xl font-bold font-mono leading-none">{Math.round(value)}</div>
        <div className={cn("text-[10px] uppercase tracking-wider font-medium mt-0.5", labelColorClass)}>
          {label}
        </div>
      </div>
    </div>
  )
}
