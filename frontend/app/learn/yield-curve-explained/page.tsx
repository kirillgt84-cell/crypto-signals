import { Metadata } from "next"
import { ArticleClient } from "../components/ArticleClient"

export const metadata: Metadata = {
  title: "Yield Curve Explained — Recession Signals & Crypto Impact | Mirkaso",
  description: "Understand how the US Treasury yield curve predicts recessions and why inverted curves matter for Bitcoin and crypto markets.",
  keywords: ['yield curve', 'inverted yield curve', 'recession probability', 'crypto macro', 'treasury yields'],
  alternates: {
    canonical: "https://mirkaso.com/learn/yield-curve-explained",
  },
}

export default function ArticlePage() {
  return <ArticleClient slug="yield-curve-explained" />
}
