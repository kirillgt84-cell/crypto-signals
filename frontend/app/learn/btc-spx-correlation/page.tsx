import { Metadata } from "next"
import { ArticleClient } from "../components/ArticleClient"

export const metadata: Metadata = {
  title: "BTC vs S&P 500 Correlation — Crypto Risk Asset Analysis | Mirkaso",
  description: "Explore why Bitcoin correlates with equities, how Fed policy drives the relationship and when crypto decouples from traditional markets.",
  keywords: ['btc spx correlation', 'bitcoin equities', 'crypto risk asset', 'fed policy crypto', 'btc decoupling'],
  alternates: {
    canonical: "https://mirkaso.com/learn/btc-spx-correlation",
  },
}

export default function ArticlePage() {
  return <ArticleClient slug="btc-spx-correlation" />
}
