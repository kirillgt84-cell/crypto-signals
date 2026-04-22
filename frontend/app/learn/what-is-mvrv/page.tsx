import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "What is MVRV Ratio? Bitcoin Valuation Guide | Mirkaso",
  description: "Learn how the Market Value to Realized Value (MVRV) ratio identifies Bitcoin tops, bottoms and fair value zones.",
  keywords: ['mvrv ratio', 'bitcoin valuation', 'crypto metrics', 'on-chain analysis', 'btc tops and bottoms'],
  alternates: {
    canonical: "https://mirkaso.com/learn/what-is-mvrv",
  },
}

export default function MVRVArticle() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/learn">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">What is MVRV Ratio?</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6 prose dark:prose-invert">
        <h2>Understanding Bitcoin Valuation Through MVRV</h2>
        <p>
          The <strong>Market Value to Realized Value (MVRV)</strong> ratio is one of the most powerful on-chain metrics for Bitcoin valuation. It compares the current market capitalization of Bitcoin to the realized capitalization — essentially measuring how much profit or loss the average holder is sitting on.
        </p>

        <h3>How MVRV Works</h3>
        <p>
          <strong>Market Value (MV)</strong> is simply the current price multiplied by the circulating supply — what we traditionally call market cap. <strong>Realized Value (RV)</strong> is different: it values each coin at the price of its last on-chain movement, creating a cost-basis metric for the entire network.
        </p>
        <p>
          When MVRV is <strong>above 3.5</strong>, Bitcoin is historically considered overvalued — this has marked every major top (2013, 2017, 2021). When MVRV drops <strong>below 1.0</strong>, the average holder is underwater, which historically signals deep value and market bottoms.
        </p>

        <h3>Key Zones to Watch</h3>
        <ul>
          <li><strong>MVRV &gt; 3.5</strong> — Euphoria zone, elevated risk of correction</li>
          <li><strong>MVRV 1.0–2.0</strong> — Fair value accumulation zone</li>
          <li><strong>MVRV &lt; 1.0</strong> — Capitulation zone, potential long-term bottom</li>
        </ul>

        <h3>Limitations</h3>
        <p>
          MVRV works best for Bitcoin due to its transparent UTXO model. It becomes less reliable for assets with significant off-chain activity (CEX trading, wrapped tokens). Always combine MVRV with other metrics like NUPL, exchange flows and macro context.
        </p>

        <p>
          <Link href="/" className="text-indigo-500 hover:underline">Check live MVRV data on Mirkaso dashboard →</Link>
        </p>
      </main>
    </div>
  )
}
