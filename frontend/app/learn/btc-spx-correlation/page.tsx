import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "BTC vs S&P 500 Correlation — Crypto Risk Asset Analysis | Mirkaso",
  description: "Explore why Bitcoin correlates with equities, how Fed policy drives the relationship and when crypto decouples from traditional markets.",
  keywords: ['btc spx correlation', 'bitcoin equities', 'crypto risk asset', 'fed policy crypto', 'btc decoupling'],
  alternates: {
    canonical: "https://mirkaso.com/learn/btc-spx-correlation",
  },
}

export default function BTCSpxArticle() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/learn">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">BTC vs S&P 500 Correlation</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6 prose dark:prose-invert">
        <h2>Is Bitcoin a Risk Asset or Digital Gold?</h2>
        <p>
          The correlation between <strong>Bitcoin and the S&P 500</strong> is one of the most debated topics in crypto. Depending on the macro regime, BTC has traded as either a high-beta risk asset or an independent store of value.
        </p>

        <h3>When Correlation Spikes</h3>
        <p>
          During <strong>Fed tightening cycles</strong> (2018, 2022), BTC/SPX correlation surged to 0.8+. Both assets sold off as real rates rose and liquidity left risk markets. In these phases, Bitcoin behaves like a leveraged tech stock rather than gold.
        </p>

        <h3>When Decoupling Happens</h3>
        <p>
          During <strong>crypto-native bull runs</strong> (2021, 2017) and Fed easing phases, correlation dropped below 0.2. Bitcoin led while equities lagged, driven by halving cycles, ETF approvals and adoption waves rather than macro liquidity.
        </p>

        <h3>How to Use This Metric</h3>
        <ul>
          <li><strong>High correlation (&gt;0.7)</strong> — Trade BTC as a risk asset; watch VIX and DXY</li>
          <li><strong>Low correlation (&lt;0.3)</strong> — Crypto-specific factors dominate; focus on on-chain data</li>
          <li><strong>Negative correlation</strong> — Rare but powerful; BTC acting as safe haven during banking stress</li>
        </ul>

        <h3>Gold as a Reference</h3>
        <p>
          Comparing BTC/Gold correlation alongside BTC/SPX tells the full story. When both correlations rise, BTC is simply a liquidity-driven asset. When BTC/SPX rises but BTC/Gold falls, Bitcoin is shifting toward a store-of-value role.
        </p>

        <p>
          <Link href="/macro" className="text-indigo-500 hover:underline">Track BTC/SPX correlation live on Mirkaso →</Link>
        </p>
      </main>
    </div>
  )
}
