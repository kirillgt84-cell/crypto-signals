import { Metadata } from "next"
import RiskParityClient from "./RiskParityClient"

export const metadata: Metadata = {
  title: "Risk Parity Portfolio Builder — All-Weather Allocation — Mirkaso",
  description: "Build all-weather portfolios with equal risk contribution. Risk Parity vs Inverse Volatility weights, backtest equity curves, and metrics comparison across economic regimes.",
  keywords: ['risk parity', 'portfolio builder', 'all-weather portfolio', 'equal risk contribution', 'inverse volatility', 'portfolio backtest', 'crypto portfolio'],
  openGraph: {
    title: "Risk Parity Portfolio Builder — All-Weather Allocation — Mirkaso",
    description: "Build all-weather portfolios with equal risk contribution and backtesting",
    url: "https://mirkaso.com/risk-parity",
    siteName: "Mirkaso",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Risk Parity Portfolio Builder — All-Weather Allocation — Mirkaso",
    description: "Build all-weather portfolios with equal risk contribution and backtesting",
  },
  alternates: {
    canonical: "https://mirkaso.com/risk-parity",
  },
}

export default function RiskParityPage() {
  return (
    <>
      <section className="sr-only">
        <h1>Risk Parity Portfolio Builder — All-Weather Allocation</h1>
        <h2>Equal Risk Contribution Portfolio Construction and Backtesting</h2>
        <p>Build diversified portfolios with Risk Parity, Inverse Volatility, and custom allocations. Backtest strategies across equities, bonds, gold, commodities and crypto.</p>
      </section>
      <RiskParityClient />
    </>
  )
}
