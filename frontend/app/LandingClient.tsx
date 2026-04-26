"use client"

import { useEffect } from "react"
import { LandingNavbar } from "./components/landing/LandingNavbar"

import { LandingFeatures } from "./components/landing/LandingFeatures"
import { LandingBenefits } from "./components/landing/LandingBenefits"
import { LandingStats } from "./components/landing/LandingStats"
import { LandingHowItWorks } from "./components/landing/LandingHowItWorks"
import { LandingPricing } from "./components/landing/LandingPricing"
import { LandingFAQ } from "./components/landing/LandingFAQ"
import { LandingCTA } from "./components/landing/LandingCTA"
import { ScrollToTop } from "./components/landing/ScrollToTop"

export default function LandingClient() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const refCode = urlParams.get("ref")
    if (refCode) {
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()
      document.cookie = `ref_code=${refCode};expires=${expires};path=/;SameSite=Lax`
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <LandingNavbar />
      <main className="flex-1">
        <LandingFeatures />
        <LandingBenefits />
        <LandingStats />
        <LandingHowItWorks />
        <LandingPricing />
        <LandingFAQ />
        <LandingCTA />
      </main>
      <ScrollToTop />
    </div>
  )
}
