export const TIER_ORDER: Record<string, number> = {
  starter: 1,
  trader: 2,
  investor: 3,
  admin: 3,
}

export const TIER_ALIASES: Record<string, string> = {
  free: "starter",
  pro: "trader",
  admin: "investor",
}

export const FEATURE_MATRIX: Record<string, string> = {
  // Starter
  position_calc: "starter",
  newsletter: "starter",
  referral_program: "starter",
  promo_codes: "starter",
  community_tg: "starter",
  email_support: "starter",
  response_time: "starter",
  learn_articles: "starter",
  faq_help: "starter",
  // Trader+
  anomaly_scanner: "trader",
  entry_levels: "trader",
  fundamentals_card: "trader",
  cvd_chart: "trader",
  sentiment_panel: "trader",
  raw_indicators: "trader",
  signal_feed: "trader",
  export_csv: "trader",
  stablecoin_flows: "trader",
  alerts_realtime: "trader",
  // Investor+
  portfolio_full: "investor",
  portfolio_metrics_full: "investor",
  ai_insight_unlimited: "investor",
  binance_sync: "investor",
  risk_parity: "investor",
  backtesting: "investor",
  custom_models: "investor",
  rebalancing_signals: "investor",
  on_chain_metrics: "investor",
  tradi_macro_full: "investor",
  api_access: "investor",
  alerts_digest: "investor",
  // Admin
  admin_panel: "admin",
}

export function normalizeTier(tier?: string): string {
  if (!tier) return "starter"
  const t = tier.toLowerCase().trim()
  return TIER_ALIASES[t] || t
}

export function tierLevel(tier?: string): number {
  return TIER_ORDER[normalizeTier(tier)] || 1
}

export function canAccess(tier: string | undefined, feature: string): boolean {
  const minTier = FEATURE_MATRIX[feature]
  if (!minTier) return true
  return tierLevel(tier) >= tierLevel(minTier)
}

export function getTierLabel(tier?: string): { label: string; color: string } {
  const t = normalizeTier(tier)
  switch (t) {
    case "starter":
      return { label: "Starter", color: "secondary" }
    case "trader":
      return { label: "Trader", color: "default" }
    case "investor":
      return { label: "Investor", color: "purple" }
    case "admin":
      return { label: "Admin", color: "destructive" }
    default:
      return { label: "Starter", color: "secondary" }
  }
}

export function getTierPrice(tier?: string): string {
  const t = normalizeTier(tier)
  switch (t) {
    case "starter":
      return "$0"
    case "trader":
      return "$19"
    case "investor":
      return "$35"
    default:
      return "$0"
  }
}
