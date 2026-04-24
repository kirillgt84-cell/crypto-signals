import { Metadata } from "next"
import { ArticleClient } from "../components/ArticleClient"

export const metadata: Metadata = {
  title: "Portfolio Risk Metrics: Sharpe, Sortino, Max Drawdown | Mirkaso",
  description: "Understand Sharpe Ratio, Sortino, Max Drawdown, Calmar, Volatility and CAGR. Learn to measure portfolio risk and return like a professional.",
  keywords: ['sharpe ratio', 'sortino ratio', 'max drawdown', 'calmar ratio', 'portfolio volatility', 'cagr', 'risk metrics'],
  alternates: {
    canonical: "https://mirkaso.com/learn/portfolio-risk-metrics",
  },
}

export default function ArticlePage() {
  return <ArticleClient slug="portfolio-risk-metrics" />
}
