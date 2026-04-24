"use client"

import { LandingNavbar } from "./components/landing/LandingNavbar"

import { LandingFeatures } from "./components/landing/LandingFeatures"
import { LandingStats } from "./components/landing/LandingStats"
import { LandingBenefits } from "./components/landing/LandingBenefits"
import { LandingHowItWorks } from "./components/landing/LandingHowItWorks"
import { LandingPricing } from "./components/landing/LandingPricing"
import { LandingFAQ } from "./components/landing/LandingFAQ"
import { LandingCTA } from "./components/landing/LandingCTA"
import { ScrollToTop } from "./components/landing/ScrollToTop"

export default function LandingClient() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNavbar />
      <main className="flex-1">
        <LandingFeatures />
        <LandingStats />
        <LandingBenefits />
        <LandingHowItWorks />
        <LandingPricing />
        <LandingFAQ />
        <LandingCTA />
      </main>
      <ScrollToTop />
    </div>
  )
}
