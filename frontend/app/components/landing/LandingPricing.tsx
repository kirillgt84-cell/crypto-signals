"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Star, Zap } from "lucide-react"
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
  const [isYearly, setIsYearly] = useState(true)

  const freeFeatures = [
    "landing.pricing.free.feature1",
    "landing.pricing.free.feature2",
    "landing.pricing.free.feature3",
    "landing.pricing.free.feature4",
    "landing.pricing.free.feature5",
    "landing.pricing.free.feature6",
    "landing.pricing.free.feature7",
    "landing.pricing.free.feature8",
  ]

  const proFeatures = [
    "landing.pricing.pro.feature1",
    "landing.pricing.pro.feature2",
    "landing.pricing.pro.feature3",
    "landing.pricing.pro.feature4",
    "landing.pricing.pro.feature5",
    "landing.pricing.pro.feature6",
    "landing.pricing.pro.feature7",
    "landing.pricing.pro.feature8",
  ]

  const proPrice = isYearly ? "$19" : "$25"
  const proPeriod = isYearly
    ? t("landing.pricing.billedYearly") || "/mo billed annually"
    : `/${t("landing.pricing.period")}`

  return (
    <section id="pricing" className="container py-24 sm:py-32">
      <div className="text-center space-y-4 mb-16">
        <h2 className="text-3xl md:text-5xl font-bold">
          {t("landing.pricing.title1")}{" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            {t("landing.pricing.titleHighlight")}
          </span>
        </h2>
        <p className="text-xl text-muted-foreground md:w-3/4 mx-auto max-w-3xl">
          {t("landing.pricing.subtitle")}
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setIsYearly(true)}
            className={`text-lg font-medium transition-colors ${isYearly ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("landing.pricing.yearly") || "Yearly"}
          </button>
          <div
            className="relative w-14 h-8 rounded-full bg-muted cursor-pointer border border-border"
            onClick={() => setIsYearly(!isYearly)}
          >
            <div
              className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-primary transition-transform ${isYearly ? "translate-x-0" : "translate-x-6"}`}
            />
          </div>
          <button
            onClick={() => setIsYearly(false)}
            className={`text-lg font-medium transition-colors ${!isYearly ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("landing.pricing.monthly") || "Monthly"}
          </button>
          {isYearly && (
            <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">
              {t("landing.pricing.save") || "Save 24%"}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-10 items-stretch">
        {/* Free Plan */}
        <Card className="flex flex-col border-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-muted to-muted/50" />
          <CardHeader className="pb-4 pt-8">
            <CardTitle className="flex items-center justify-between text-2xl">
              <span className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                {t("landing.pricing.free.name")}
              </span>
            </CardTitle>
            <div className="mt-4">
              <span className="text-5xl font-bold tracking-tight">{t("landing.pricing.free.price")}</span>
              <span className="text-muted-foreground text-lg"> /{t("landing.pricing.period")}</span>
            </div>
            <CardDescription className="text-base mt-3 leading-relaxed">
              {t("landing.pricing.free.description")}
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-4">
            <Button className="w-full text-base py-6" variant="outline" asChild>
              <Link href="/pricing">{t("landing.pricing.free.cta")}</Link>
            </Button>
          </CardContent>

          <hr className="border-dashed mx-6" />

          <CardFooter className="flex-1 pt-6 pb-8">
            <ul className="space-y-4 w-full">
              {freeFeatures.map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-base text-muted-foreground leading-snug">{t(key)}</span>
                </li>
              ))}
            </ul>
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className="flex flex-col border-2 border-primary/40 relative overflow-hidden shadow-2xl shadow-primary/10">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary" />
          <CardHeader className="pb-4 pt-8">
            <CardTitle className="flex items-center justify-between text-2xl">
              <span className="flex items-center gap-2">
                <Star className="w-6 h-6 text-primary fill-primary" />
                {t("landing.pricing.pro.name")}
              </span>
              <Badge variant="secondary" className="text-sm text-primary font-semibold px-3 py-1">
                {t("landing.pricing.popular")}
              </Badge>
            </CardTitle>
            <div className="mt-4">
              <span className="text-5xl font-bold tracking-tight">{proPrice}</span>
              <span className="text-muted-foreground text-lg"> {proPeriod}</span>
            </div>
            <CardDescription className="text-base mt-3 leading-relaxed">
              {t("landing.pricing.pro.description")}
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-4">
            <Button className="w-full text-base py-6" asChild>
              <Link href="/pricing">{t("landing.pricing.pro.cta")}</Link>
            </Button>
          </CardContent>

          <hr className="border-dashed mx-6" />

          <CardFooter className="flex-1 pt-6 pb-8">
            <ul className="space-y-4 w-full">
              {/* Includes free */}
              <li className="flex items-start gap-3 pb-3 border-b border-dashed">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-base font-semibold text-foreground leading-snug">
                  {t("landing.pricing.includesFree")}
                </span>
              </li>
              {proFeatures.map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-base text-muted-foreground leading-snug">{t(key)}</span>
                </li>
              ))}
            </ul>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}
