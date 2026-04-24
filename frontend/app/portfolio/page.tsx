import { Metadata } from "next"
import PortfolioClient from "./PortfolioClient"

export const metadata: Metadata = {
  title: "Portfolio Tracker & Risk Metrics — Mirkaso",
  description: "Track your crypto portfolio across exchanges and wallets. Analyze Sharpe, Sortino, Max Drawdown, Calmar, Volatility and CAGR with period selector.",
  keywords: ['crypto portfolio tracker', 'portfolio risk metrics', 'sharpe ratio crypto', 'max drawdown', 'portfolio allocation', 'crypto positions'],
  openGraph: {
    title: "Portfolio Tracker & Risk Metrics — Mirkaso",
    description: "Track crypto portfolio positions and analyze risk metrics",
    url: "https://mirkaso.com/portfolio",
    siteName: "Mirkaso",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Portfolio Tracker & Risk Metrics — Mirkaso",
    description: "Track crypto portfolio positions and analyze risk metrics",
  },
  alternates: {
    canonical: "https://mirkaso.com/portfolio",
  },
}

export default function PortfolioPage() {
  return (
    <>
      <section className="sr-only">
        <h1>Crypto Portfolio Tracker and Risk Metrics</h1>
        <h2>Sharpe Ratio, Sortino, Max Drawdown, Calmar, Volatility and CAGR Analysis</h2>
        <p>Track your crypto portfolio across exchanges and wallets. Analyze portfolio risk metrics with 30/90/180/365-day period selectors.</p>
      </section>
      <PortfolioClient />
    </>
  )
}
