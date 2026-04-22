import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "On-Chain Metrics Guide — Essential Crypto Indicators | Mirkaso",
  description: "A comprehensive guide to on-chain metrics: MVRV, NUPL, exchange flows, whale movements and network activity for Bitcoin and crypto analysis.",
  keywords: ['on-chain metrics', 'blockchain analysis', 'crypto indicators', 'bitcoin on-chain', 'whale movements'],
  alternates: {
    canonical: "https://mirkaso.com/learn/on-chain-metrics",
  },
}

export default function OnChainArticle() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/learn">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">On-Chain Metrics Guide</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6 prose dark:prose-invert">
        <h2>Reading the Blockchain for Alpha</h2>
        <p>
          On-chain analysis examines blockchain data to understand investor behavior, network health and market cycles. Unlike technical analysis, on-chain metrics are based on immutable ledger data — making them harder to manipulate.
        </p>

        <h3>Core Metrics Every Trader Should Know</h3>

        <h4>MVRV Ratio</h4>
        <p>Market Value to Realized Value. Identifies when BTC is overvalued (&gt;3.5) or undervalued (&lt;1.0).</p>

        <h4>NUPL (Net Unrealized Profit/Loss)</h4>
        <p>Shows what portion of the network is in profit. Positive NUPL in greed zone signals tops; negative NUPL in fear zone signals bottoms.</p>

        <h4>Exchange Flows</h4>
        <p>Net inflows to exchanges = selling pressure. Net outflows = accumulation and reduced liquid supply.</p>

        <h4>Whale Movements</h4>
        <p>Wallets holding 1,000+ BTC. Large outflows from exchanges to cold wallets signal institutional accumulation.</p>

        <h4>Network Activity</h4>
        <p>Active addresses, transaction volume and hash rate indicate network adoption and security.</p>

        <h3>Combining Metrics</h3>
        <p>
          No single metric is perfect. The most reliable signals emerge when multiple metrics align: MVRV in the green zone + heavy exchange outflows + rising whale balances = strong accumulation setup.
        </p>

        <p>
          <Link href="/dashboard" className="text-indigo-500 hover:underline">Explore on-chain data on Mirkaso →</Link>
        </p>
      </main>
    </div>
  )
}
