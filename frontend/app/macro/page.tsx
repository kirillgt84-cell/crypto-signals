import { Metadata } from "next";
import MacroClient from "./MacroClient";

export const metadata: Metadata = {
  title: "Macro Analysis — BTC/SPX Correlation, VIX & Gold — Mirkaso",
  description: "Cross-asset macro analysis: Bitcoin correlation with S&P 500, Gold and VIX. Track crypto risk regime, safe-haven dynamics and market stress indicators.",
  keywords: ['macro analysis', 'btc spx correlation', 'bitcoin correlation', 'vix crypto', 'gold btc', 'market regime'],
  openGraph: {
    title: "Macro Analysis — BTC/SPX Correlation, VIX & Gold — Mirkaso",
    description: "Cross-asset macro analysis and crypto risk regime tracking",
    url: "https://mirkaso.com/macro",
    siteName: "Mirkaso",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Macro Analysis — BTC/SPX Correlation, VIX & Gold — Mirkaso",
    description: "Cross-asset macro analysis and crypto risk regime tracking",
  },
  alternates: {
    canonical: "https://mirkaso.com/macro",
  },
};

export default function MacroPage() {
  return (
    <>
      <section className="sr-only">
        <h1>Macro Analysis — BTC/SPX Correlation, VIX & Gold Dynamics</h1>
        <h2>Cross-Asset Correlation and Market Regime Tracking for Crypto Traders</h2>
        <p>Track Bitcoin correlation with S&P 500, Gold and VIX to understand crypto risk regime and safe-haven dynamics.</p>
      </section>
      <MacroClient />
    </>
  )
}
