import { Metadata } from "next"
import PositionCalcClient from "./PositionCalcClient"

export const metadata: Metadata = {
  title: "Position Calculator — Risk-Based Sizing for Traders — Mirkaso",
  description: "Calculate position size, leverage, and allocation based on your risk parameters. Control risk before entering a trade. Pro feature.",
  keywords: ['position calculator', 'position sizing', 'trading risk', 'leverage calculator', 'stop loss calculator', 'pro trading tool'],
  openGraph: {
    title: "Position Calculator — Risk-Based Sizing for Traders — Mirkaso",
    description: "Calculate position size, leverage, and allocation based on your risk parameters. Control risk before entering a trade.",
    url: "https://mirkaso.com/position-calc",
    siteName: "Mirkaso",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Position Calculator — Risk-Based Sizing for Traders — Mirkaso",
    description: "Calculate position size, leverage, and allocation based on your risk parameters. Control risk before entering a trade.",
  },
  alternates: {
    canonical: "https://mirkaso.com/position-calc",
  },
}

export default function PositionCalcPage() {
  return (
    <>
      <section className="sr-only">
        <h1>Position Calculator — Risk-Based Position Sizing for Crypto Traders</h1>
        <h2>Calculate Quantity, Leverage, and Allocation Before Entering a Trade</h2>
        <p>Enter your portfolio balance, risk tolerance, entry and stop prices to get precise position sizing, required leverage, and capital allocation.</p>
      </section>
      <PositionCalcClient />
    </>
  )
}
