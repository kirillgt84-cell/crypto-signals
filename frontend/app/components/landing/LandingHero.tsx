"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  CandlestickChart,
  LayoutGrid,
  GitCompare,
  Gauge,
  ClipboardCheck,
  CircleDollarSign,
  Coins,
  Building2,
  TrendingUp,
  Network,
  Scale,
  BarChart4,
} from "lucide-react"
import { useLanguage } from "@/app/context/LanguageContext"

const benefits = [
  { icon: BarChart4, key: "landing.hero.benefit1" },
  { icon: GitCompare, key: "landing.hero.benefit2" },
  { icon: Gauge, key: "landing.hero.benefit3" },
  { icon: ClipboardCheck, key: "landing.hero.benefit4" },
  { icon: CircleDollarSign, key: "landing.hero.benefit5" },
  { icon: Coins, key: "landing.hero.benefit6" },
  { icon: Building2, key: "landing.hero.benefit7" },
  { icon: TrendingUp, key: "landing.hero.benefit8" },
  { icon: Network, key: "landing.hero.benefit9" },
  { icon: Scale, key: "landing.hero.benefit10" },
]

export function LandingHero() {
  const { t } = useLanguage()

  return (
    <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-32 gap-10">
      <div className="text-center lg:text-start space-y-6">
        <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium text-primary bg-primary/10">
          <CandlestickChart className="mr-2 h-4 w-4" />
          {t("landing.hero.badge")}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1]">
          {t("landing.hero.title1")}{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
            {t("landing.hero.titleHighlight")}
          </span>{" "}
          {t("landing.hero.title2")}
        </h1>

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
      </div>

      {/* Visual side — benefits bento grid */}
      <div className="relative hidden lg:flex items-center justify-center">
        <div className="relative w-full max-w-[480px]">
          <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/10 p-5 space-y-3">
            {/* Main highlight card */}
            <div className="col-span-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t("landing.hero.benefit0.title")}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("landing.hero.benefit0.description")}
              </p>
            </div>

            {/* Benefits grid */}
            <div className="grid grid-cols-2 gap-2">
              {benefits.map(({ icon: Icon, key }) => (
                <div
                  key={key}
                  className="p-2.5 rounded-lg bg-muted/40 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <Icon className="h-4 w-4 text-primary mb-1.5" />
                  <p className="text-xs font-medium leading-tight">{t(`${key}.title`)}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {t(`${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
