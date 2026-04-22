import { Metadata } from "next"
import { ArticleClient } from "../components/ArticleClient"

export const metadata: Metadata = {
  title: "VIX and Crypto — Fear Index as a Bitcoin Risk Signal | Mirkaso",
  description: "Learn how the VIX volatility index predicts crypto drawdowns and why market fear spreads from equities to Bitcoin.",
  keywords: ['vix crypto', 'fear index bitcoin', 'crypto volatility', 'market stress', 'risk off crypto'],
  alternates: {
    canonical: "https://mirkaso.com/learn/vix-and-crypto",
  },
}

export default function ArticlePage() {
  return <ArticleClient slug="vix-and-crypto" />
}
