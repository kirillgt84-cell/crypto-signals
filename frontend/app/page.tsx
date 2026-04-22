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
  return <HomeClient />
}
