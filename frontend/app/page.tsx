import { Metadata, Viewport } from 'next'
import LandingClient from './LandingClient'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export const metadata: Metadata = {
  title: 'Mirkaso — Crypto Trading Signals & Investment Analytics Dashboard',
  description:
    'All-in-one crypto analytics for active traders and long-term investors. OI scanner, CVD, funding rates, entry checklist, macro correlations, risk parity, on-chain metrics, ETF flows. Start free, upgrade to Pro for $19/mo.',
  keywords: [
    'crypto trading signals',
    'bitcoin analytics',
    'open interest scanner',
    'funding rates',
    'CVD trading',
    'on-chain metrics',
    'crypto dashboard',
    'macro correlations',
    'risk parity portfolio',
    'ETF flows',
    'Mirkaso',
    'crypto entry checklist',
    'altseason indicator',
    'liquidation levels',
    'position calculator',
  ],
  openGraph: {
    title: 'Mirkaso — Crypto Trading Signals & Investment Analytics Dashboard',
    description:
      'All-in-one crypto analytics for traders and investors. Real-time OI, CVD, funding, macro, on-chain.',
    url: 'https://mirkaso.com',
    siteName: 'Mirkaso',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mirkaso — Crypto Trading Signals & Investment Analytics Dashboard',
    description:
      'All-in-one crypto analytics for traders and investors. Real-time OI, CVD, funding, macro, on-chain.',
    creator: '@mirkaso',
  },
  alternates: {
    canonical: 'https://mirkaso.com',
    languages: {
      'x-default': 'https://mirkaso.com',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
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
        sameAs: ['https://t.me/mirkaso_com'],
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
        offers: [
          {
            '@type': 'Offer',
            name: 'Free',
            price: '0',
            priceCurrency: 'USD',
          },
          {
            '@type': 'Offer',
            name: 'Pro',
            price: '19',
            priceCurrency: 'USD',
            priceValidUntil: '2026-12-31',
            billingIncrement: 1,
            unitCode: 'MON',
          },
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '100',
        },
        featureList: [
          'OI scanner',
          'CVD analysis',
          'Funding rates',
          'Entry checklist',
          'Macro correlations',
          'Risk parity',
          'On-chain metrics',
          'ETF flows',
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is Mirkaso?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Mirkaso is an advanced analytics platform for crypto traders and investors. We combine on-chain metrics, derivatives data, macro analysis, and AI-powered signals into one unified dashboard.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is Mirkaso free to use?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, we offer a free tier with market dashboard, macro overview, heatmap, and manual portfolio tracking. Pro plan unlocks anomaly scanner, entry levels, AI portfolio analytics, and alerts.',
            },
          },
          {
            '@type': 'Question',
            name: 'Which assets are supported?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'We cover major cryptocurrencies including BTC, ETH, SOL, BNB, XRP, DOGE, ADA, LINK, AVAX, and POL — with more assets added regularly.',
            },
          },
          {
            '@type': 'Question',
            name: 'How accurate are the trading signals?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Our signals combine multiple data sources including open interest, funding rates, CVD, exchange flows, and technical indicators. Each signal includes a strength score for confidence assessment.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I use Mirkaso on mobile?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Absolutely. Mirkaso is fully responsive and works seamlessly on desktop, tablet, and mobile browsers.',
            },
          },
        ],
      },
      {
        '@type': 'Product',
        name: 'Mirkaso Pro',
        description:
          'Unlock advanced analytics, AI insights, and professional risk management tools.',
        url: 'https://mirkaso.com/#pricing',
        brand: {
          '@type': 'Brand',
          name: 'Mirkaso',
        },
        offers: {
          '@type': 'Offer',
          price: '19',
          priceCurrency: 'USD',
          priceValidUntil: '2026-12-31',
          availability: 'https://schema.org/InStock',
          url: 'https://mirkaso.com/#pricing',
          priceSpecification: {
            '@type': 'PriceSpecification',
            price: '19',
            priceCurrency: 'USD',
            billingIncrement: 1,
            unitCode: 'MON',
            description: 'Billed annually at $228/year',
          },
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
      <LandingClient />
    </>
  )
}
