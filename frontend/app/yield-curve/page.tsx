import { Metadata } from "next";
import YieldCurveClient from "./YieldCurveClient";

export const metadata: Metadata = {
  title: "Yield Curve & Recession Signals — Mirkaso",
  description: "US Treasury yield curve analysis, recession probability, spread indicators and historical analogs. Understand macro regime impact on crypto markets.",
  keywords: ['yield curve', 'recession probability', 'treasury spread', 'macro signals', 'crypto macro', 'inverted yield curve'],
  openGraph: {
    title: "Yield Curve & Recession Signals — Mirkaso",
    description: "US Treasury yield curve analysis and recession probability",
    url: "https://mirkaso.com/yield-curve",
    siteName: "Mirkaso",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yield Curve & Recession Signals — Mirkaso",
    description: "US Treasury yield curve analysis and recession probability",
  },
  alternates: {
    canonical: "https://mirkaso.com/yield-curve",
  },
};

export default function YieldCurvePage() {
  return <YieldCurveClient />;
}
