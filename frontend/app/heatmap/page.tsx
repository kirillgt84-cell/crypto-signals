import { Metadata } from "next"
import HeatmapClient from "./HeatmapClient"

export const metadata: Metadata = {
  title: "Heatmap — Mirkaso",
  description: "Market heatmap with sector analysis",
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
