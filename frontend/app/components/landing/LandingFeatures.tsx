"use client"

import {
  CandlestickChart,
  Flame,
  Network,
  TrendingUp,
  Layers,
  Radio,
  PieChart,
  LineChart,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/app/context/LanguageContext"

const traderFeatures = [
  { icon: CandlestickChart, key: "landing.features.trader1" },
  { icon: Flame, key: "landing.features.trader2" },
  { icon: Radio, key: "landing.features.trader3" },
  { icon: TrendingUp, key: "landing.features.trader4" },
]

const investorFeatures = [
  { icon: Network, key: "landing.features.investor1" },
  { icon: Layers, key: "landing.features.investor2" },
  { icon: PieChart, key: "landing.features.investor3" },
  { icon: LineChart, key: "landing.features.investor4" },
]

export function LandingFeatures() {
  const { t } = useLanguage()

  return (
    <section id="features" className="container py-24 sm:py-32 space-y-16">
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {traderFeatures.map(({ icon: Icon, key }) => (
            <Card key={key} className="group hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{t(`${key}.title`)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t(`${key}.description`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* For Investors */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-center">
          {t("landing.features.investorTitle")}
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {investorFeatures.map(({ icon: Icon, key }) => (
            <Card key={key} className="group hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="mb-2 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{t(`${key}.title`)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t(`${key}.description`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
