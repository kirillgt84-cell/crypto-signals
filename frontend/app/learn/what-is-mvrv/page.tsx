import { Metadata } from "next"
import { ArticleClient } from "../components/ArticleClient"

export const metadata: Metadata = {
  title: "What is MVRV Ratio? Bitcoin Valuation Guide | Mirkaso",
  description: "Learn how the Market Value to Realized Value (MVRV) ratio identifies Bitcoin tops, bottoms and fair value zones.",
  keywords: ['mvrv ratio', 'bitcoin valuation', 'crypto metrics', 'on-chain analysis', 'btc tops and bottoms'],
  alternates: {
    canonical: "https://mirkaso.com/learn/what-is-mvrv",
  },
}

export default function ArticlePage() {
  return <ArticleClient slug="what-is-mvrv" />
}
