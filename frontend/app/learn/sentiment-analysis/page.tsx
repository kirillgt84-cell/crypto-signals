import { Metadata } from "next"
import { ArticleClient } from "../components/ArticleClient"

export const metadata: Metadata = {
  title: "Crypto Sentiment Analysis: Binance Metrics Guide | Mirkaso",
  description: "Master crypto sentiment with Long/Short ratio, Top Trader positioning and Taker Volume. Read market mood before it moves.",
  keywords: ['crypto sentiment', 'binance long short ratio', 'top trader ratio', 'taker volume', 'market sentiment analysis'],
  alternates: {
    canonical: "https://mirkaso.com/learn/sentiment-analysis",
  },
}

export default function ArticlePage() {
  return <ArticleClient slug="sentiment-analysis" />
}
