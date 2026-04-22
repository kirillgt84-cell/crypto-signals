"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart3, TrendingUp, Shield } from "lucide-react"
import { useLanguage } from "@/app/context/LanguageContext"

export function LandingHero() {
  const { t } = useLanguage()

  return (
    <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-32 gap-10">
      <div className="text-center lg:text-start space-y-6">
        <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium text-primary bg-primary/10">
          <TrendingUp className="mr-2 h-4 w-4" />
          {t("landing.hero.badge")}
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          {t("landing.hero.title1")}{" "}
          <span className="inline bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
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

      {/* Visual side */}
      <div className="relative hidden lg:flex items-center justify-center">
        <div className="relative w-full max-w-[500px] aspect-square">
          {/* Abstract chart visual */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-background border border-primary/10 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded-full bg-primary/20" />
              <div className="h-3 w-12 rounded-full bg-primary/20" />
            </div>
            <div className="flex-1 rounded-xl bg-muted/50 p-4 flex items-end gap-2">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-primary/40"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">BTC</div>
                <div className="text-lg font-bold text-emerald-500">+2.4%</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">ETH</div>
                <div className="text-lg font-bold text-emerald-500">+1.8%</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">SOL</div>
                <div className="text-lg font-bold text-red-500">-0.5%</div>
              </div>
            </div>
          </div>
          {/* Floating badge */}
          <div className="absolute -right-4 top-8 rounded-xl border bg-card p-3 shadow-lg">
            <div className="text-xs text-muted-foreground">{t("landing.hero.signalLabel")}</div>
            <div className="text-sm font-bold text-emerald-500 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> LONG
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
