"use client"

import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"
import { getTierLabel } from "@/app/lib/tiers"

interface TierBlurOverlayProps {
  children: React.ReactNode
  title?: string
  description?: string
  requiredFeature?: string
  requiredTier?: string
}

export function TierBlurOverlay({
  children,
  title,
  description,
  requiredFeature,
  requiredTier,
}: TierBlurOverlayProps) {
  const { canAccess, tierLevel, isAuthenticated, normalizedTier } = useAuth()
  const { t } = useLanguage()

  const hasAccess = requiredFeature
    ? canAccess(requiredFeature)
    : requiredTier
      ? tierLevel >= (requiredTier === "trader" ? 2 : requiredTier === "investor" ? 3 : 1)
      : true

  if (hasAccess) {
    return <>{children}</>
  }

  const targetTier = requiredTier || (requiredFeature ? "trader" : "trader")
  const tierLabel = getTierLabel(targetTier).label

  return (
    <div className="relative h-full w-full">
      <div className="blur-[6px] pointer-events-none select-none h-full w-full">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/30 px-4 text-center">
        <Lock className="mb-2 h-6 w-6 text-amber-500" />
        <p className="text-sm font-bold text-foreground">{title || t("proOverlay.title")}</p>
        {description && <p className="mt-1 max-w-[200px] text-xs text-slate-300">{description}</p>}
        {!isAuthenticated ? (
          <Button
            size="sm"
            className="mt-3 bg-amber-500 text-foreground hover:bg-amber-600"
            onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
          >
            {t("common.signIn")}
          </Button>
        ) : (
          <Button
            size="sm"
            className="mt-3 bg-amber-500 text-foreground hover:bg-amber-600"
            onClick={() => (window.location.href = "/profile?tab=subscription")}
          >
            {t("pricing.upgradeTo")} {tierLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

// Backward-compatible alias
export const ProBlurOverlay = TierBlurOverlay
