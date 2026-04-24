"use client"

import { UserPlus, Layers, BarChart3, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/app/context/LanguageContext"

const steps = [
  { icon: UserPlus, key: "landing.howItWorks.step1" },
  { icon: Layers, key: "landing.howItWorks.step2" },
  { icon: BarChart3, key: "landing.howItWorks.step3" },
  { icon: Target, key: "landing.howItWorks.step4" },
]

export function LandingHowItWorks() {
  const { t } = useLanguage()

  return (
    <section id="how-it-works" className="container text-center py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold">
        {t("landing.howItWorks.title1")}{" "}
        <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
          {t("landing.howItWorks.titleHighlight")}
        </span>
      </h2>
      <p className="md:w-3/4 mx-auto mt-4 mb-12 text-xl text-muted-foreground">
        {t("landing.howItWorks.subtitle")}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map(({ icon: Icon, key }, index) => (
          <Card key={key} className="bg-muted/50">
            <CardHeader className="pt-6">
              <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold w-8 h-8">
                {index + 1}
              </div>
              <CardTitle className="grid gap-4 place-items-center">
                <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </div>
                {t(`${key}.title`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t(`${key}.description`)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
