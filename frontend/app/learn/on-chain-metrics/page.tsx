import { Metadata } from "next"
import { ArticleClient } from "../components/ArticleClient"

export const metadata: Metadata = {
  title: "On-Chain Metrics Guide — Essential Crypto Indicators | Mirkaso",
  description: "A comprehensive guide to on-chain metrics: MVRV, NUPL, exchange flows, whale movements and network activity for Bitcoin and crypto analysis.",
  keywords: ['on-chain metrics', 'blockchain analysis', 'crypto indicators', 'bitcoin on-chain', 'whale movements'],
  alternates: {
    canonical: "https://mirkaso.com/learn/on-chain-metrics",
  },
}

export default function ArticlePage() {
  return <ArticleClient slug="on-chain-metrics" />
}
