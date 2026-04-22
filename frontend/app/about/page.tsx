import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Target, Shield, Zap, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "About Mirkaso — Crypto Analytics Platform",
  description: "Learn about Mirkaso mission, methodology and team. We provide precision analytics for crypto traders and investors.",
  keywords: ['about mirkaso', 'crypto analytics company', 'trading intelligence platform', 'crypto signals methodology'],
  openGraph: {
    title: "About Mirkaso — Crypto Analytics Platform",
    description: "Precision analytics for crypto traders and investors",
    url: "https://mirkaso.com/about",
    siteName: "Mirkaso",
    type: "website",
  },
  alternates: {
    canonical: "https://mirkaso.com/about",
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">About Mirkaso</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Mirkaso was built to bridge the gap between institutional-grade analytics and everyday crypto traders. 
            We aggregate on-chain data, derivatives metrics and macro signals into actionable intelligence 
            — so you can make informed decisions in any market regime.
          </p>
        </section>

        <section className="mb-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border p-6">
            <Target className="h-8 w-8 text-indigo-500 mb-3" />
            <h3 className="font-semibold mb-2">Precision First</h3>
            <p className="text-sm text-muted-foreground">Every signal is backtested against historical data before it reaches your dashboard.</p>
          </div>
          <div className="rounded-xl border p-6">
            <Shield className="h-8 w-8 text-emerald-500 mb-3" />
            <h3 className="font-semibold mb-2">Data Integrity</h3>
            <p className="text-sm text-muted-foreground">We source directly from exchanges, blockchains and established market data providers.</p>
          </div>
          <div className="rounded-xl border p-6">
            <Zap className="h-8 w-8 text-amber-500 mb-3" />
            <h3 className="font-semibold mb-2">Real-Time</h3>
            <p className="text-sm text-muted-foreground">Markets move fast. Our pipelines refresh every 15 minutes for critical metrics.</p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">What We Track</h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
              <span><strong>On-chain metrics</strong> — MVRV, NUPL, exchange flows, whale movements and network activity.</span>
            </li>
            <li className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
              <span><strong>Derivatives data</strong> — Open interest, funding rates, liquidation clusters and CVD.</span>
            </li>
            <li className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
              <span><strong>Macro cross-assets</strong> — BTC/SPX correlation, Gold, VIX and yield curve dynamics.</span>
            </li>
            <li className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
              <span><strong>Institutional flows</strong> — Bitcoin ETF inflows/outflows and fund movements.</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
          <p className="text-muted-foreground mb-4">
            Have questions or feedback? Reach out at <a href="mailto:support@mirkaso.com" className="text-indigo-500 hover:underline">support@mirkaso.com</a>
          </p>
          <Link href="/contact">
            <Button variant="outline">Contact Us</Button>
          </Link>
        </section>
      </main>
    </div>
  )
}
