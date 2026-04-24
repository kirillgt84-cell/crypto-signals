import { Metadata } from "next"
import { ArticleClient } from "../components/ArticleClient"

export const metadata: Metadata = {
  title: "M2 Global Liquidity & Bitcoin: Why Money Supply Matters | Mirkaso",
  description: "Explore how M2 money supply correlates with Bitcoin, S&P 500, Gold and VIX. Use global liquidity as a macro regime indicator.",
  keywords: ['m2 money supply', 'global liquidity', 'bitcoin macro', 'm2 correlation crypto', 'liquidity overlay'],
  alternates: {
    canonical: "https://mirkaso.com/learn/m2-liquidity",
  },
}

export default function ArticlePage() {
  return <ArticleClient slug="m2-liquidity" />
}
