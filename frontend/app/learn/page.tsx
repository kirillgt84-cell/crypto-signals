import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Learn — Crypto Trading & Market Analysis Guides | Mirkaso",
  description: "Educational guides on crypto metrics: MVRV, yield curve, ETF flows, on-chain analysis, open interest and market regimes. Level up your trading knowledge.",
  keywords: ['crypto education', 'trading guides', 'on-chain analysis', 'yield curve explained', 'bitcoin etf flows', 'mvrv ratio', 'risk parity', 'portfolio risk metrics', 'sentiment analysis', 'm2 liquidity'],
  openGraph: {
    title: "Learn — Crypto Trading & Market Analysis Guides | Mirkaso",
    description: "Educational guides on crypto metrics and market analysis",
    url: "https://mirkaso.com/learn",
    siteName: "Mirkaso",
    type: "website",
  },
  alternates: {
    canonical: "https://mirkaso.com/learn",
  },
}

const articles = [
  {
    slug: "what-is-mvrv",
    title: "What is MVRV Ratio?",
    description: "Understand the Market Value to Realized Value ratio and how it signals Bitcoin tops and bottoms.",
  },
  {
    slug: "yield-curve-explained",
    title: "Yield Curve Explained",
    description: "How the US Treasury yield curve predicts recessions and impacts crypto markets.",
  },
  {
    slug: "btc-spx-correlation",
    title: "BTC vs S&P 500 Correlation",
    description: "Why Bitcoin correlates with equities and what it means for your portfolio.",
  },
  {
    slug: "bitcoin-etf-flows",
    title: "Bitcoin ETF Flows Analysis",
    description: "Track institutional money moving into Bitcoin through spot ETFs.",
  },
  {
    slug: "vix-and-crypto",
    title: "VIX and Crypto Volatility",
    description: "How the fear index predicts crypto drawdowns and risk-off events.",
  },
  {
    slug: "on-chain-metrics",
    title: "On-Chain Metrics Guide",
    description: "Essential blockchain indicators every crypto trader should know.",
  },
  {
    slug: "open-interest-trading",
    title: "Open Interest in Crypto Trading",
    description: "Use derivatives open interest to spot trend strength and reversals.",
  },
  {
    slug: "market-regimes",
    title: "Understanding Market Regimes",
    description: "Identify risk-on, risk-off and transition phases in crypto markets.",
  },
  {
    slug: "risk-parity-explained",
    title: "What is Risk Parity?",
    description: "Build all-weather portfolios with equal risk contribution across equities, bonds, gold and crypto.",
  },
  {
    slug: "portfolio-risk-metrics",
    title: "Portfolio Risk Metrics Explained",
    description: "Sharpe, Sortino, Max Drawdown, Calmar, Volatility and CAGR — measure risk like a pro.",
  },
  {
    slug: "sentiment-analysis",
    title: "Crypto Sentiment Analysis",
    description: "Read market mood with Binance Long/Short ratio, Top Trader positioning and Taker Volume.",
  },
  {
    slug: "m2-liquidity",
    title: "M2 Global Liquidity & Crypto",
    description: "Why money supply matters for Bitcoin and how to use M2 as a macro regime indicator.",
  },
]

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="ml-4 text-xl font-bold tracking-tight">Learn</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 lg:px-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-3">Crypto Trading & Market Analysis</h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Educational guides to help you understand the metrics, indicators and macro forces that drive crypto markets.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.slug} href={`/learn/${article.slug}`}>
              <Card className="h-full hover:border-indigo-500/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-500" />
                    {article.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{article.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
