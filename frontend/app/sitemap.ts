import { MetadataRoute } from 'next'

const BASE_URL = 'https://mirkaso.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '', priority: 1.0, changefreq: 'daily' as const },
    { path: '/signals', priority: 0.9, changefreq: 'daily' as const },
    { path: '/macro', priority: 0.9, changefreq: 'daily' as const },
    { path: '/yield-curve', priority: 0.9, changefreq: 'daily' as const },
    { path: '/etf', priority: 0.8, changefreq: 'daily' as const },
    { path: '/heatmap', priority: 0.8, changefreq: 'daily' as const },
    { path: '/pricing', priority: 0.7, changefreq: 'weekly' as const },
    { path: '/help', priority: 0.6, changefreq: 'monthly' as const },
  ]

  return routes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changefreq,
    priority: route.priority,
  }))
}
