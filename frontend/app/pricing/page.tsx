import { Metadata } from "next"
import { Suspense } from "react"
import PricingClient from "./PricingClient"

export const metadata: Metadata = {
  title: "Pricing — Mirkaso Pro Plans",
  description: "Choose your Mirkaso plan: Free tier with essential analytics or Pro with advanced signals, portfolio tools and Telegram alerts.",
  keywords: ['crypto analytics pricing', 'trading signals subscription', 'mirkaso pro', 'crypto dashboard plans'],
  openGraph: {
    title: "Pricing — Mirkaso Pro Plans",
    description: "Free and Pro plans for crypto analytics and trading signals",
    url: "https://mirkaso.com/pricing",
    siteName: "Mirkaso",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — Mirkaso Pro Plans",
    description: "Free and Pro plans for crypto analytics and trading signals",
  },
  alternates: {
    canonical: "https://mirkaso.com/pricing",
  },
}

export default function PricingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Mirkaso Pro',
    description: 'Advanced crypto analytics platform with AI-powered signals, portfolio management, and risk tools.',
    url: 'https://mirkaso.com/pricing',
    brand: {
      '@type': 'Brand',
      name: 'Mirkaso',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '100',
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '19',
        priceCurrency: 'USD',
        priceValidUntil: '2026-12-31',
        availability: 'https://schema.org/InStock',
        url: 'https://mirkaso.com/pricing',
        priceSpecification: {
          '@type': 'PriceSpecification',
          price: '19',
          priceCurrency: 'USD',
          billingIncrement: 1,
          unitCode: 'MON',
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
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <PricingClient />
      </Suspense>
    </>
  )
}
