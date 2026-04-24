import { Metadata } from "next"
import { ArticleClient } from "../components/ArticleClient"

export const metadata: Metadata = {
  title: "What is Risk Parity? All-Weather Portfolio Strategy | Mirkaso",
  description: "Learn how Risk Parity allocates capital for equal risk contribution across equities, bonds, gold, commodities and crypto. Build resilient portfolios.",
  keywords: ['risk parity', 'portfolio construction', 'all-weather portfolio', 'equal risk contribution', 'crypto portfolio'],
  alternates: {
    canonical: "https://mirkaso.com/learn/risk-parity-explained",
  },
}

export default function ArticlePage() {
  return <ArticleClient slug="risk-parity-explained" />
}
