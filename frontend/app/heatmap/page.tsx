import { Metadata } from "next"
import HeatmapClient from "./HeatmapClient"

export const metadata: Metadata = {
  title: "Crypto Market Heatmap — Mirkaso",
  description: "Visual crypto market heatmap with sector analysis, volume deltas and price action. Spot hot altcoins and market trends at a glance.",
  keywords: ['crypto heatmap', 'market heatmap', 'altcoin scanner', 'volume delta', 'crypto sector analysis'],
  openGraph: {
    title: "Crypto Market Heatmap — Mirkaso",
    description: "Visual crypto market heatmap with sector analysis and volume deltas",
    url: "https://mirkaso.com/heatmap",
    siteName: "Mirkaso",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crypto Market Heatmap — Mirkaso",
    description: "Visual crypto market heatmap with sector analysis and volume deltas",
  },
  alternates: {
    canonical: "https://mirkaso.com/heatmap",
  },
}

import { API_BASE_URL } from "@/app/lib/api"

async function getHeatmapData() {
  try {
    const res = await fetch(
      `${API_BASE_URL}/market/heatmap?timeframe=m15&sector=all&limit=200&min_volume=500000`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) return []
    const json = await res.json()
    return json.items || []
  } catch {
    return []
  }
}

export default async function HeatmapPage() {
  const data = await getHeatmapData()
  return <HeatmapClient initialData={data} />
}
