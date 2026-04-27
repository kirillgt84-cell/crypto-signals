import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/profile', '/admin', '/auth/callback', '/api'],
      },
    ],
    sitemap: 'https://mirkaso.com/sitemap.xml',
  }
}
