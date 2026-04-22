import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Yield Curve Explained — Recession Signals & Crypto Impact | Mirkaso",
  description: "Understand how the US Treasury yield curve predicts recessions and why inverted curves matter for Bitcoin and crypto markets.",
  keywords: ['yield curve', 'inverted yield curve', 'recession probability', 'crypto macro', 'treasury yields'],
  alternates: {
    canonical: "https://mirkaso.com/learn/yield-curve-explained",
  },
}

export default function YieldCurveArticle() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/learn">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">Yield Curve Explained</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6 prose dark:prose-invert">
        <h2>What the Yield Curve Tells Us About Markets</h2>
        <p>
          The <strong>yield curve</strong> plots the interest rates of US Treasury bonds across different maturities — from 3-month bills to 30-year bonds. It is one of the most reliable predictors of economic recessions and has profound implications for risk assets like Bitcoin.
        </p>

        <h3>Normal vs Inverted Curve</h3>
        <p>
          A <strong>normal yield curve</strong> slopes upward: long-term rates are higher than short-term rates because investors demand more yield for locking up money longer. An <strong>inverted yield curve</strong> occurs when short-term rates exceed long-term rates — this has preceded every US recession since 1955.
        </p>

        <h3>Why Inversions Matter for Crypto</h3>
        <p>
          Inverted curves signal tight monetary policy and looming economic stress. In such environments, liquidity leaves risk assets first. Bitcoin, despite its "digital gold" narrative, has historically sold off during the early phase of inversions (2022, 2018) before eventually decoupling as rates are cut.
        </p>

        <h3>Key Spreads to Watch</h3>
        <ul>
          <li><strong>10Y–2Y spread</strong> — The classic recession predictor</li>
          <li><strong>10Y–3M spread</strong> — Favored by the Fed for recession probability models</li>
          <li><strong>30Y–10Y spread</strong> — Reflects long-term inflation expectations</li>
        </ul>

        <h3>Current Context</h3>
        <p>
          When the yield curve steepens after inversion (dis-inversion), it often marks the transition from recession fear to recovery hope. For crypto traders, tracking this transition is as important as watching on-chain metrics.
        </p>

        <p>
          <Link href="/yield-curve" className="text-indigo-500 hover:underline">View live yield curve data on Mirkaso →</Link>
        </p>
      </main>
    </div>
  )
}
