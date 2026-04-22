import { Metadata } from 'next'
import SignalsClient from "./SignalsClient";

export const metadata: Metadata = {
  title: "Crypto Trading Signals — Mirkaso",
  description: "Real-time crypto trading signals: volume spikes, open interest anomalies, liquidation clusters and market scanner for Bitcoin, Ethereum and altcoins.",
  keywords: ['crypto signals', 'trading signals', 'volume spike', 'open interest', 'liquidation cluster', 'bitcoin signals'],
  openGraph: {
    title: "Crypto Trading Signals — Mirkaso",
    description: "Real-time crypto trading signals and market scanner",
    url: "https://mirkaso.com/signals",
    siteName: "Mirkaso",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crypto Trading Signals — Mirkaso",
    description: "Real-time crypto trading signals and market scanner",
  },
  alternates: {
    canonical: "https://mirkaso.com/signals",
  },
};

export default function SignalsPage() {
  return (
    <>
      <section className="sr-only">
        <h1>Crypto Trading Signals — Volume Spikes & Open Interest Anomalies</h1>
        <h2>Real-Time Market Scanner for Bitcoin, Ethereum and Altcoins</h2>
        <p>Identify high-probability trading setups through volume spikes, OI anomalies and liquidation cluster analysis.</p>
      </section>
      <SignalsClient />
    </>
  )
}
