import { Metadata } from "next"
import { ArticleClient } from "../components/ArticleClient"

export const metadata: Metadata = {
  title: "Bitcoin ETF Flows Analysis — Institutional Crypto Tracking | Mirkaso",
  description: "Track Bitcoin spot ETF inflows and outflows in real-time. Understand how institutional money moves BTC markets through regulated investment vehicles.",
  keywords: ['bitcoin etf', 'etf flows', 'institutional crypto', 'spot etf', 'btc etf inflows'],
  alternates: {
    canonical: "https://mirkaso.com/learn/bitcoin-etf-flows",
  },
}

export default function ArticlePage() {
  return <ArticleClient slug="bitcoin-etf-flows" />
}
