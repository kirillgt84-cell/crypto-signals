import { MetadataRoute } from 'next'

const BASE_URL = 'https://mirkaso.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '', priority: 1.0, changefreq: 'daily' as const },
    { path: '/signals', priority: 0.9, changefreq: 'daily' as const },
    { path: '/macro', priority: 0.9, changefreq: 'daily' as const },
    { path: '/crypto-metrics', priority: 0.9, changefreq: 'daily' as const },
    { path: '/yield-curve', priority: 0.9, changefreq: 'daily' as const },
    { path: '/etf', priority: 0.8, changefreq: 'daily' as const },
    { path: '/heatmap', priority: 0.8, changefreq: 'daily' as const },
    { path: '/pricing', priority: 0.7, changefreq: 'weekly' as const },
    { path: '/about', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/faq', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/contact', priority: 0.5, changefreq: 'monthly' as const },
    { path: '/privacy', priority: 0.3, changefreq: 'yearly' as const },
    { path: '/terms', priority: 0.3, changefreq: 'yearly' as const },
    { path: '/help', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/learn', priority: 0.7, changefreq: 'weekly' as const },
    { path: '/learn/what-is-mvrv', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/learn/yield-curve-explained', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/learn/btc-spx-correlation', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/learn/bitcoin-etf-flows', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/learn/vix-and-crypto', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/learn/on-chain-metrics', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/learn/open-interest-trading', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/learn/market-regimes', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/risk-parity', priority: 0.8, changefreq: 'daily' as const },
    { path: '/portfolio', priority: 0.8, changefreq: 'daily' as const },
    { path: '/learn/risk-parity-explained', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/learn/portfolio-risk-metrics', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/learn/sentiment-analysis', priority: 0.6, changefreq: 'monthly' as const },
    { path: '/learn/m2-liquidity', priority: 0.6, changefreq: 'monthly' as const },
  ]

  return routes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changefreq,
    priority: route.priority,
  }))
}
