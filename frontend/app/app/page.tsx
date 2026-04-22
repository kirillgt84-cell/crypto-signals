import { Metadata } from 'next'
import AppClient from './AppClient'

export const metadata: Metadata = {
  title: 'Dashboard — Mirkaso',
  description: 'Advanced analytics platform for crypto traders: on-chain metrics, trading signals, macro analysis, yield curve, ETF flows and market heatmaps.',
  robots: {
    index: false,
    follow: false,
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
      <AppClient />
    </>
  )
}
