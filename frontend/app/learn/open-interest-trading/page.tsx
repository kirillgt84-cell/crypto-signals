import { Metadata } from "next"
import { ArticleClient } from "../components/ArticleClient"

export const metadata: Metadata = {
  title: "Open Interest in Crypto Trading — Derivatives Analysis | Mirkaso",
  description: "Use open interest, funding rates and liquidation data to identify trend strength and potential reversals in crypto derivatives markets.",
  keywords: ['open interest', 'crypto derivatives', 'funding rate', 'liquidation data', 'oi trading'],
  alternates: {
    canonical: "https://mirkaso.com/learn/open-interest-trading",
  },
}

export default function ArticlePage() {
  return <ArticleClient slug="open-interest-trading" />
}
