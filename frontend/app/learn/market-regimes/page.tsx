import { Metadata } from "next"
import { ArticleClient } from "../components/ArticleClient"

export const metadata: Metadata = {
  title: "Market Regimes — Risk-On, Risk-Off & Crypto Cycles | Mirkaso",
  description: "Learn to identify risk-on, risk-off and transition phases in crypto markets using macro indicators, correlations and on-chain data.",
  keywords: ['market regimes', 'risk on risk off', 'crypto cycles', 'macro trading', 'market phases'],
  alternates: {
    canonical: "https://mirkaso.com/learn/market-regimes",
  },
}

export default function ArticlePage() {
  return <ArticleClient slug="market-regimes" />
}
