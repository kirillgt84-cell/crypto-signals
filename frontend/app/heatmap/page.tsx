import HeatmapClient from "./HeatmapClient"

const API_BASE_URL = "https://crypto-signals-production-ff4c.up.railway.app/api/v1"

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
