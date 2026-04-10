"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  collapsed?: boolean
  className?: string
}

export function Logo({ collapsed = false, className }: LogoProps) {
  if (collapsed) {
    // Only icon when sidebar is collapsed
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="relative w-8 h-8">
          <svg viewBox="0 0 40 40" className="w-full h-full">
            {/* Chart bars */}
            <rect x="6" y="24" width="6" height="10" fill="hsl(var(--primary))" rx="1"/>
            <rect x="14" y="20" width="6" height="14" fill="hsl(var(--primary))" rx="1"/>
            <rect x="22" y="16" width="6" height="18" fill="hsl(var(--primary))" rx="1"/>
            <rect x="30" y="12" width="6" height="22" fill="hsl(var(--primary))" rx="1"/>
            {/* Green arrow */}
            <path d="M 8 26 L 20 14 L 32 6" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round"/>
            <polygon points="32,6 28,8 28,12" fill="#22c55e"/>
          </svg>
        </div>
      </div>
    )
  }

  // Full logo with text
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative w-8 h-8">
        <svg viewBox="0 0 40 40" className="w-full h-full">
          {/* Chart bars */}
          <rect x="6" y="24" width="6" height="10" fill="hsl(var(--primary))" rx="1"/>
          <rect x="14" y="20" width="6" height="14" fill="hsl(var(--primary))" rx="1"/>
          <rect x="22" y="16" width="6" height="18" fill="hsl(var(--primary))" rx="1"/>
          <rect x="30" y="12" width="6" height="22" fill="hsl(var(--primary))" rx="1"/>
          {/* Green arrow */}
          <path d="M 8 26 L 20 14 L 32 6" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <polygon points="32,6 28,8 28,12" fill="#22c55e"/>
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight">
        FAST LANE
      </span>
    </div>
  )
}

// Simple icon version for favicon/loading
export function LogoIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 40 40" className="w-full h-full">
        <rect x="6" y="24" width="6" height="10" fill="hsl(var(--primary))" rx="1"/>
        <rect x="14" y="20" width="6" height="14" fill="hsl(var(--primary))" rx="1"/>
        <rect x="22" y="16" width="6" height="18" fill="hsl(var(--primary))" rx="1"/>
        <rect x="30" y="12" width="6" height="22" fill="hsl(var(--primary))" rx="1"/>
        <path d="M 8 26 L 20 14 L 32 6" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <polygon points="32,6 28,8 28,12" fill="#22c55e"/>
      </svg>
    </div>
  )
}
