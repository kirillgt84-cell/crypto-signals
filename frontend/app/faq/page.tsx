import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "FAQ — Mirkaso Help Center",
  description: "Frequently asked questions about Mirkaso platform, trading signals, pricing, data sources and account settings.",
  keywords: ['mirkaso faq', 'crypto signals faq', 'trading platform help', 'mirkaso questions'],
  openGraph: {
    title: "FAQ — Mirkaso Help Center",
    description: "Answers to common questions about Mirkaso platform",
    url: "https://mirkaso.com/faq",
    siteName: "Mirkaso",
    type: "website",
  },
  alternates: {
    canonical: "https://mirkaso.com/faq",
  },
}

const faqs = [
  {
    q: "What is Mirkaso?",
    a: "Mirkaso is an advanced analytics platform for crypto traders. We aggregate on-chain metrics, derivatives data, macro indicators and institutional flows into a unified dashboard with real-time signals."
  },
  {
    q: "How accurate are the trading signals?",
    a: "Our signals are based on quantitative models backtested against historical market data. No signal is guaranteed — they represent elevated probability setups derived from market structure, not financial advice."
  },
  {
    q: "What data sources do you use?",
    a: "We source data directly from exchanges (Binance, OKX), blockchain explorers, FRED (Federal Reserve), ETF providers and proprietary on-chain analytics pipelines."
  },
  {
    q: "How often is data refreshed?",
    a: "Critical metrics like price, open interest and funding rates refresh every 15 minutes. Macro data (ETF flows, yield curve) updates daily. On-chain metrics sync every 4 hours."
  },
  {
    q: "What is included in the Free plan?",
    a: "Free tier includes basic dashboard access, market heatmap, ETF flow summaries and delayed signals. Pro unlocks real-time alerts, Telegram notifications, portfolio analytics and advanced interpretations."
  },
  {
    q: "How do I upgrade to Pro?",
    a: "Visit the Pricing page, select the Pro plan and complete checkout. Your account upgrades instantly."
  },
  {
    q: "Can I connect my exchange account?",
    a: "Portfolio tracking supports Binance read-only API keys. We never request withdrawal permissions. Other exchange integrations are on the roadmap."
  },
  {
    q: "Is my data secure?",
    a: "Yes. We use JWT authentication, encrypted API keys at rest and never share your personal data with third parties. See our Privacy Policy for details."
  },
  {
    q: "How do I get Telegram alerts?",
    a: "Go to Profile → Subscription, connect your Telegram account via the bot link, then enable Telegram alerts in your preferences."
  },
  {
    q: "Do you offer API access?",
    a: "A public API is in development. Pro users will receive priority access when it launches."
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">Frequently Asked Questions</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
        <div className="space-y-8">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b pb-6 last:border-0">
              <h2 className="text-lg font-semibold mb-2">{faq.q}</h2>
              <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border p-6 text-center">
          <p className="text-muted-foreground mb-4">Still have questions?</p>
          <Link href="/contact">
            <Button>Contact Support</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
