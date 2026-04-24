"use client"

import {
  CheckCircle,
  Brain,
  SlidersHorizontal,
  Calculator,
  ScanLine,
  LayoutDashboard,
  Newspaper,
  Eye,
  History,
  Gauge,
  PieChart,
  CalendarClock,
  Shield,
  LogOut,
  Compass,
  TrendingUp,
} from "lucide-react"
import { useLanguage } from "@/app/context/LanguageContext"

const traderFeatures = [
  { icon: CheckCircle, key: "landing.features.trader1" },
  { icon: Brain, key: "landing.features.trader2" },
  { icon: SlidersHorizontal, key: "landing.features.trader3" },
  { icon: Calculator, key: "landing.features.trader4" },
  { icon: ScanLine, key: "landing.features.trader5" },
  { icon: LayoutDashboard, key: "landing.features.trader6" },
  { icon: Newspaper, key: "landing.features.trader7" },
  { icon: Eye, key: "landing.features.trader8" },
  { icon: History, key: "landing.features.trader9" },
]

const investorFeatures = [
  { icon: Gauge, key: "landing.features.investor1" },
  { icon: PieChart, key: "landing.features.investor2" },
  { icon: CalendarClock, key: "landing.features.investor3" },
  { icon: Shield, key: "landing.features.investor4" },
  { icon: LogOut, key: "landing.features.investor5" },
  { icon: Compass, key: "landing.features.investor6" },
  { icon: TrendingUp, key: "landing.features.investor7" },
]

export function LandingFeatures() {
  const { t } = useLanguage()

  return (
    <section id="features" className="container py-16 sm:py-20 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold">
          {t("landing.features.title1")}{" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            {t("landing.features.titleHighlight")}
          </span>{" "}
          {t("landing.features.title2")}
        </h2>
        <p className="text-xl text-muted-foreground md:w-3/4 mx-auto">
          {t("landing.features.subtitle")}
        </p>
      </div>

      {/* For Traders */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-center">
          {t("landing.features.traderTitle")}
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {traderFeatures.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="group flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-muted/30 hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <div className="shrink-0 mt-0.5">
                <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-semibold text-sm leading-snug">
                  {t(`${key}.title`)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t(`${key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* For Investors */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-center">
          {t("landing.features.investorTitle")}
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investorFeatures.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="group flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-muted/30 hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              <div className="shrink-0 mt-0.5">
                <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-semibold text-sm leading-snug">
                  {t(`${key}.title`)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t(`${key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
