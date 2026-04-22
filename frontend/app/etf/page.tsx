import { Metadata } from "next"
import EtfClient from "./EtfClient"

export const metadata: Metadata = {
  title: "Bitcoin ETF Flows & Analytics — Mirkaso",
  description: "Track Bitcoin ETF inflows and outflows in real-time. Spot crypto market sentiment through institutional ETF movements.",
  keywords: ['bitcoin etf', 'etf flows', 'crypto etf', 'institutional crypto', 'btc etf inflows'],
  openGraph: {
    title: "Bitcoin ETF Flows & Analytics — Mirkaso",
    description: "Real-time Bitcoin ETF inflow and outflow tracking",
    url: "https://mirkaso.com/etf",
    siteName: "Mirkaso",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bitcoin ETF Flows & Analytics — Mirkaso",
    description: "Real-time Bitcoin ETF inflow and outflow tracking",
  },
  alternates: {
    canonical: "https://mirkaso.com/etf",
  },
}

export default function EtfPage() {
  return <EtfClient />
}
