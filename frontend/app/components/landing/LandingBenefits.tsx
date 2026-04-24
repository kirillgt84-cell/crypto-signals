"use client"

import {
  LayoutGrid,
  GitCompare,
  Activity,
  ClipboardCheck,
  CircleDollarSign,
  Coins,
  Building2,
  LineChart,
  Network,
  Scale,
  Thermometer,
} from "lucide-react"
import { useLanguage } from "@/app/context/LanguageContext"

const benefits = [
  { icon: Activity, key: "landing.hero.benefit1" },
  { icon: GitCompare, key: "landing.hero.benefit2" },
  { icon: Thermometer, key: "landing.hero.benefit3" },
  { icon: ClipboardCheck, key: "landing.hero.benefit4" },
  { icon: CircleDollarSign, key: "landing.hero.benefit5" },
  { icon: Coins, key: "landing.hero.benefit6" },
  { icon: Building2, key: "landing.hero.benefit7" },
  { icon: LineChart, key: "landing.hero.benefit8" },
  { icon: Network, key: "landing.hero.benefit9" },
  { icon: Scale, key: "landing.hero.benefit10" },
]

export function LandingBenefits() {
  const { t } = useLanguage()

  return (
    <section className="container py-16 sm:py-20">
      <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/10 p-6 space-y-4">
        {/* Main highlight card */}
        <div className="col-span-2 p-5 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <LayoutGrid className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <span className="text-lg font-semibold">{t("landing.hero.benefit0.title")}</span>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">
            {t("landing.hero.benefit0.description")}
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {benefits.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="p-4 rounded-lg bg-muted/40 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <Icon className="h-5 w-5 text-primary mb-2" strokeWidth={1.5} />
              <p className="text-sm font-medium leading-tight">{t(`${key}.title`)}</p>
              <p className="text-xs text-muted-foreground leading-tight mt-1">
                {t(`${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
