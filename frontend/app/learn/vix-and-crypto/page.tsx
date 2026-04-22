import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "VIX and Crypto — Fear Index as a Bitcoin Risk Signal | Mirkaso",
  description: "Learn how the VIX volatility index predicts crypto drawdowns and why market fear spreads from equities to Bitcoin.",
  keywords: ['vix crypto', 'fear index bitcoin', 'crypto volatility', 'market stress', 'risk off crypto'],
  alternates: {
    canonical: "https://mirkaso.com/learn/vix-and-crypto",
  },
}

export default function VIXArticle() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/learn">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">VIX and Crypto Volatility</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6 prose dark:prose-invert">
        <h2>The Fear Index Meets Digital Assets</h2>
        <p>
          The <strong>VIX</strong> measures implied volatility of S&P 500 options — nicknamed the "fear index." While it tracks equities, VIX spikes have become one of the most reliable leading indicators for crypto drawdowns.
        </p>

        <h3>Why VIX Predicts Crypto</h3>
        <p>
          During market stress, risk managers enforce cross-asset deleveraging. When VIX exceeds 25, margin calls hit equity portfolios first, then cascade into crypto as traders sell their most volatile holdings. Bitcoin, despite its decentralized narrative, is still treated as a risk asset by institutional desks.
        </p>

        <h3>Historical Patterns</h3>
        <ul>
          <li><strong>VIX &gt; 30</strong> — Crypto typically drops 20–40% as risk-off accelerates</li>
          <li><strong>VIX 20–25</strong> — Elevated caution; correlations between BTC and SPX spike</li>
          <li><strong>VIX &lt; 18</strong> — Complacency zone; often precedes volatility expansion</li>
        </ul>

        <h3>Crypto Volatility Multiplier</h3>
        <p>
          Bitcoin volatility is typically <strong>3–5x the VIX</strong>. A VIX spike from 20 to 30 (+50%) historically corresponds to a BTC drop of 15–25%. This multiplier makes VIX monitoring essential for crypto risk management.
        </p>

        <h3>Using VIX in Your Strategy</h3>
        <p>
          Rather than reacting to VIX spikes, track VIX term structure. A rising front-month VIX alongside flat back-months signals immediate panic — the worst environment for crypto longs. Conversely, a falling VIX curve after a spike often marks the bottom.
        </p>

        <p>
          <Link href="/macro" className="text-indigo-500 hover:underline">See live VIX and correlation data on Mirkaso →</Link>
        </p>
      </main>
    </div>
  )
}
