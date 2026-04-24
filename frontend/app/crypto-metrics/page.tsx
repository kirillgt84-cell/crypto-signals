import { Metadata } from "next";
import CryptoMetricsClient from "./CryptoMetricsClient";

export const metadata: Metadata = {
  title: "Crypto Metrics — BTC Dominance, Capital Flows & Market Phase — Mirkaso",
  description: "Track Bitcoin dominance, altcoin and stablecoin market share. Understand market phase, capital flows, and get actionable signals for traders and investors.",
  keywords: ['crypto metrics', 'btc dominance', 'altcoin dominance', 'stablecoin dominance', 'market phase', 'capital flows'],
  openGraph: {
    title: "Crypto Metrics — BTC Dominance, Capital Flows & Market Phase — Mirkaso",
    description: "Track Bitcoin dominance, altcoin and stablecoin market share. Understand market phase and capital flows.",
    url: "https://mirkaso.com/crypto-metrics",
    siteName: "Mirkaso",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crypto Metrics — BTC Dominance, Capital Flows & Market Phase — Mirkaso",
    description: "Track Bitcoin dominance, altcoin and stablecoin market share. Understand market phase and capital flows.",
  },
  alternates: {
    canonical: "https://mirkaso.com/crypto-metrics",
  },
};

export default function CryptoMetricsPage() {
  return (
    <>
      <section className="sr-only">
        <h1>Crypto Metrics — BTC Dominance and Capital Flow Analysis</h1>
        <h2>Track Market Phase, Dominance Shifts, and Capital Rotation for Informed Decisions</h2>
        <p>Analyze Bitcoin dominance, altcoin market share, stablecoin flows, and receive actionable trading signals based on market structure.</p>
      </section>
      <CryptoMetricsClient />
    </>
  )
}
