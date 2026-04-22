import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Open Interest in Crypto Trading — Derivatives Analysis | Mirkaso",
  description: "Use open interest, funding rates and liquidation data to identify trend strength and potential reversals in crypto derivatives markets.",
  keywords: ['open interest', 'crypto derivatives', 'funding rate', 'liquidation data', 'oi trading'],
  alternates: {
    canonical: "https://mirkaso.com/learn/open-interest-trading",
  },
}

export default function OIArticle() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/learn">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">Open Interest in Crypto Trading</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6 prose dark:prose-invert">
        <h2>What Open Interest Tells You</h2>
        <p>
          <strong>Open Interest (OI)</strong> measures the total number of outstanding derivatives contracts — futures and perpetual swaps — that have not been settled. Unlike volume, OI tracks how much capital is actively deployed in leveraged positions.
        </p>

        <h3>Rising OI + Rising Price</h3>
        <p>
          New money is entering long positions. The trend is backed by conviction and fresh capital. This is the healthiest bullish setup.
        </p>

        <h3>Rising OI + Falling Price</h3>
        <p>
          Aggressive shorting. Bears are piling in, but if price stabilizes, a short squeeze becomes likely. Watch funding rates: very negative funding + rising OI = explosive rebound potential.
        </p>

        <h3>Falling OI + Falling Price</h3>
        <p>
          Longs are giving up and closing positions. This is capitulation — painful, but often marks local bottoms as weak hands exit.
        </p>

        <h3>Falling OI + Rising Price</h3>
        <p>
          Shorts are covering, not new longs entering. The move lacks conviction and is vulnerable to reversal once short covering exhausts.
        </p>

        <h3>Funding Rate as a Filter</h3>
        <p>
          Funding rate reveals whether longs or shorts are paying premium. Extreme positive funding (&gt;0.01%) means overcrowded longs — a contrarian sell signal. Extreme negative funding suggests overcrowded shorts — a contrarian buy signal.
        </p>

        <p>
          <Link href="/signals" className="text-indigo-500 hover:underline">Analyze OI and funding on Mirkaso →</Link>
        </p>
      </main>
    </div>
  )
}
