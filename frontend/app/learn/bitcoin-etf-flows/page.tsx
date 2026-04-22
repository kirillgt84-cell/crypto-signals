import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Bitcoin ETF Flows Analysis — Institutional Crypto Tracking | Mirkaso",
  description: "Track Bitcoin spot ETF inflows and outflows. Understand how institutional money moves BTC markets through regulated investment vehicles.",
  keywords: ['bitcoin etf', 'etf flows', 'institutional crypto', 'spot etf', 'btc etf inflows'],
  alternates: {
    canonical: "https://mirkaso.com/learn/bitcoin-etf-flows",
  },
}

export default function ETFFlowsArticle() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/learn">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">Bitcoin ETF Flows Analysis</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6 prose dark:prose-invert">
        <h2>How ETF Flows Move Bitcoin Markets</h2>
        <p>
          The approval of spot Bitcoin ETFs in January 2024 marked a structural shift in crypto markets. For the first time, traditional investors could gain Bitcoin exposure through regulated brokerage accounts — and the resulting capital flows became a leading price driver.
        </p>

        <h3>Why Flows Matter</h3>
        <p>
          Unlike futures-based ETFs, <strong>spot ETFs</strong> must buy actual Bitcoin to back shares. Sustained inflows create persistent buy pressure, while outflows force passive selling. Daily flow data now serves as a real-time sentiment gauge for institutional demand.
        </p>

        <h3>Reading the Data</h3>
        <ul>
          <li><strong>Net positive flows</strong> — Institutional accumulation; tends to support price</li>
          <li><strong>Net negative flows</strong> — Profit-taking or risk-off; often precedes corrections</li>
          <li><strong>Flow concentration</strong> — Heavy inflows into a single issuer signal advisor/RIA adoption</li>
        </ul>

        <h3>Relationship to Price</h3>
        <p>
          Flows typically <strong>lead price</strong> by 1–3 days during trend changes, but lag during parabolic moves. The GBTC overhang (early 2024) demonstrated how unlock-driven outflows can suppress price even as spot demand rises.
        </p>

        <h3>Key Issuers to Watch</h3>
        <p>
          BlackRock (IBIT), Fidelity (FBTC), Grayscale (GBTC) and Ark Invest (ARKB) collectively manage the majority of spot Bitcoin ETF assets. Tracking their individual flow patterns reveals geographic and demographic demand differences.
        </p>

        <p>
          <Link href="/etf" className="text-indigo-500 hover:underline">Monitor live ETF flows on Mirkaso →</Link>
        </p>
      </main>
    </div>
  )
}
