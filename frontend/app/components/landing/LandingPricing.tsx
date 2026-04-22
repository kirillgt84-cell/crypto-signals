"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLanguage } from "@/app/context/LanguageContext"

export function LandingPricing() {
  const { t } = useLanguage()

  const plans = [
    { key: "landing.pricing.free", popular: false },
    { key: "landing.pricing.pro", popular: true },
  ]

  return (
    <section id="pricing" className="container py-24 sm:py-32">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-3xl md:text-4xl font-bold">
          {t("landing.pricing.title1")}{" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            {t("landing.pricing.titleHighlight")}
          </span>
        </h2>
        <p className="text-xl text-muted-foreground md:w-3/4 mx-auto">
          {t("landing.pricing.subtitle")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map(({ key, popular }) => (
          <Card
            key={key}
            className={
              popular
                ? "drop-shadow-xl shadow-black/10 dark:shadow-white/10 border-primary/50"
                : ""
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t(`${key}.name`)}
                {popular ? (
                  <Badge variant="secondary" className="text-sm text-primary">
                    {t("landing.pricing.popular")}
                  </Badge>
                ) : null}
              </CardTitle>
              <div>
                <span className="text-3xl font-bold">{t(`${key}.price`)}</span>
                <span className="text-muted-foreground"> /{t("landing.pricing.period")}</span>
              </div>
              <CardDescription>{t(`${key}.description`)}</CardDescription>
            </CardHeader>

            <CardContent>
              <Button className="w-full" variant={popular ? "default" : "outline"} asChild>
                <Link href="/pricing">{t(`${key}.cta`)}</Link>
              </Button>
            </CardContent>

            <hr className="w-4/5 m-auto mb-4" />

            <CardFooter className="flex">
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{t(`${key}.feature${i}`)}</span>
                  </span>
                ))}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  )
}
