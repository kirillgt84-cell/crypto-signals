import { Metadata } from 'next'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
  title: 'Mirkaso — Crypto Analytics & Trading Signals',
  description: 'Advanced analytics platform for crypto traders: on-chain metrics, trading signals, macro analysis, yield curve, ETF flows and market heatmaps.',
  keywords: ['crypto signals', 'bitcoin analytics', 'trading signals', 'on-chain analysis', 'crypto dashboard', 'Mirkaso'],
  openGraph: {
    title: 'Mirkaso — Crypto Analytics & Trading Signals',
    description: 'Advanced analytics platform for crypto traders',
    url: 'https://mirkaso.com',
    siteName: 'Mirkaso',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mirkaso — Crypto Analytics & Trading Signals',
    description: 'Advanced analytics platform for crypto traders',
  },
  alternates: {
    canonical: 'https://mirkaso.com',
  },
}

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Mirkaso',
        url: 'https://mirkaso.com',
        logo: 'https://mirkaso.com/favicon.svg',
        sameAs: [
          'https://t.me/mirkaso_com',
        ],
      },
      {
        '@type': 'WebSite',
        name: 'Mirkaso',
        url: 'https://mirkaso.com',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://mirkaso.com/?search={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Mirkaso',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Any',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '100',
        },
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="sr-only">
        <h1>Mirkaso — Crypto Analytics & Trading Signals Platform</h1>
        <h2>On-Chain Metrics, Derivatives Data and Macro Analysis for Bitcoin and Altcoins</h2>
        <p>Real-time trading signals, market heatmaps, ETF flow tracking and yield curve analysis for crypto traders.</p>
      </section>
      <HomeClient />
    </>
  )
}
