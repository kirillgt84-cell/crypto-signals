import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Market Regimes — Risk-On, Risk-Off & Crypto Cycles | Mirkaso",
  description: "Learn to identify risk-on, risk-off and transition phases in crypto markets using macro indicators, correlations and on-chain data.",
  keywords: ['market regimes', 'risk on risk off', 'crypto cycles', 'macro trading', 'market phases'],
  alternates: {
    canonical: "https://mirkaso.com/learn/market-regimes",
  },
}

export default function MarketRegimesArticle() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/learn">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">Understanding Market Regimes</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6 prose dark:prose-invert">
        <h2>Market Regimes: The Macro Playbook</h2>
        <p>
          A <strong>market regime</strong> is a sustained environment where specific assets, strategies and correlations behave predictably. Identifying the current regime is more important than predicting prices — because regime determines which tools work and which fail.
        </p>

        <h3>Risk-On</h3>
        <p>
          Characterized by falling VIX, steep yield curve, strong BTC/SPX correlation and positive ETF flows. Crypto rallies, altcoins outperform Bitcoin, and leverage expands. Best strategy: long beta, accumulate high-conviction alts.
        </p>

        <h3>Risk-Off Early</h3>
        <p>
          VIX spikes above 25, yield curve inverts, BTC/SPX correlation peaks and ETF flows turn negative. Liquidity evaporates. Best strategy: reduce leverage, move to stablecoins or cash, hedge with shorts.
        </p>

        <h3>Risk-Off Late</h3>
        <p>
          Capitulation phase. On-chain metrics hit extremes (MVRV &lt; 1, NUPL negative), funding rates deeply negative and OI collapses. Everyone is bearish. Best strategy: gradual accumulation, dollar-cost averaging into spot positions.
        </p>

        <h3>Recovery / Transition</h3>
        <p>
          Yield curve steepens, VIX falls from highs, BTC leads while SPX lags. On-chain accumulation resumes. Best strategy: spot longs, selective altcoin exposure, avoid excessive leverage until trend confirms.
        </p>

        <h3>Regime Identification Framework</h3>
        <p>
          Mirkaso combines yield curve shape, BTC/SPX correlation, VIX level and on-chain accumulation metrics into a unified regime signal. Rather than guessing tops and bottoms, the regime framework tells you <em>how</em> to position for the current environment.
        </p>

        <p>
          <Link href="/yield-curve" className="text-indigo-500 hover:underline">Explore regime signals on Mirkaso →</Link>
        </p>
      </main>
    </div>
  )
}
