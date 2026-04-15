"use client"

import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "../context/AuthContext"

interface ProBlurOverlayProps {
  children: React.ReactNode
  title?: string
  description?: string
}

export function ProBlurOverlay({ children, title = "Pro Feature", description }: ProBlurOverlayProps) {
  const { isPro, isAuthenticated } = useAuth()

  if (isPro) {
    return <>{children}</>
  }

  return (
    <div className="relative h-full w-full">
      <div className="blur-[6px] pointer-events-none select-none h-full w-full">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/30 px-4 text-center">
        <Lock className="mb-2 h-6 w-6 text-amber-500" />
        <p className="text-sm font-bold text-white">{title}</p>
        {description && <p className="mt-1 max-w-[200px] text-xs text-slate-300">{description}</p>}
        {!isAuthenticated ? (
          <Button
            size="sm"
            className="mt-3 bg-amber-500 text-white hover:bg-amber-600"
            onClick={() => {
              // Dispatch custom event or use window location hash to trigger auth modal
              window.dispatchEvent(new CustomEvent("open-auth-modal"))
            }}
          >
            Sign in to unlock
          </Button>
        ) : (
          <Button
            size="sm"
            className="mt-3 bg-amber-500 text-white hover:bg-amber-600"
            onClick={() => (window.location.href = "/profile?tab=subscription")}
          >
            Upgrade to Pro
          </Button>
        )}
      </div>
    </div>
  )
}
