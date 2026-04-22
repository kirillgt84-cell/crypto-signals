"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart3, Shield } from "lucide-react"
import { useLanguage } from "@/app/context/LanguageContext"

export function LandingHero() {
  const { t } = useLanguage()

  return (
    <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-32 gap-10">
      <div className="text-center lg:text-start space-y-6">
        <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium text-primary bg-primary/10">
          <BarChart3 className="mr-2 h-4 w-4" />
          {t("landing.hero.badge")}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1]">
          {t("landing.hero.title1")}{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
            {t("landing.hero.titleHighlight")}
          </span>{" "}
          {t("landing.hero.title2")}
        </h1>

        <p className="text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0">
          {t("landing.hero.description")}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
          <Button size="lg" asChild className="gap-2">
            <Link href="/app">
              {t("landing.hero.ctaPrimary")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">{t("landing.hero.ctaSecondary")}</Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground pt-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span>{t("landing.hero.trust1")}</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span>{t("landing.hero.trust2")}</span>
          </div>
        </div>
      </div>

      {/* Visual side — abstract chart */}
      <div className="relative hidden lg:flex items-center justify-center">
        <div className="relative w-full max-w-[480px]">
          <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/10 p-6">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-6">
              <div className="h-2.5 w-20 rounded-full bg-primary/20" />
              <div className="h-2.5 w-10 rounded-full bg-primary/20" />
            </div>

            {/* Abstract bars */}
            <div className="flex items-end gap-2 h-48 mb-6 px-2">
              {[35, 55, 40, 70, 50, 85, 65, 90, 55, 80, 60, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-primary/30"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            {/* Abstract line chart overlay */}
            <svg viewBox="0 0 400 60" className="w-full h-12 mb-4">
              <path
                d="M0,45 Q50,40 100,30 T200,25 T300,15 T400,10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary/40"
              />
              <path
                d="M0,50 Q50,45 100,35 T200,30 T300,20 T400,18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary/20"
              />
            </svg>

            {/* Bottom indicators */}
            <div className="flex gap-3">
              <div className="flex-1 rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="h-2 w-12 rounded-full bg-primary/20" />
                <div className="h-2 w-8 rounded-full bg-primary/30" />
              </div>
              <div className="flex-1 rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="h-2 w-12 rounded-full bg-primary/20" />
                <div className="h-2 w-8 rounded-full bg-primary/30" />
              </div>
              <div className="flex-1 rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="h-2 w-12 rounded-full bg-primary/20" />
                <div className="h-2 w-8 rounded-full bg-primary/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
