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
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PricingClient />
    </Suspense>
  )
}
