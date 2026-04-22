import { Metadata } from "next"
import HelpClient from "./HelpClient"

export const metadata: Metadata = {
  title: "Help & Support — Mirkaso",
  description: "Get help with Mirkaso platform. Find answers about signals, pricing, account settings and API access.",
  keywords: ['mirkaso help', 'crypto signals support', 'trading platform faq', 'mirkaso documentation'],
  openGraph: {
    title: "Help & Support — Mirkaso",
    description: "Get help with Mirkaso platform and trading signals",
    url: "https://mirkaso.com/help",
    siteName: "Mirkaso",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Help & Support — Mirkaso",
    description: "Get help with Mirkaso platform and trading signals",
  },
  alternates: {
    canonical: "https://mirkaso.com/help",
  },
}

export default function HelpPage() {
  return <HelpClient />
}
