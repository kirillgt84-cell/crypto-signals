"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/app/context/LanguageContext"

export function LandingHero() {
  const { t } = useLanguage()

  return (
    <section className="container flex flex-col items-center justify-center text-center py-20 md:py-32 gap-6">
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] max-w-4xl">
        {t("landing.hero.title1")}{" "}
        <span className="bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
          {t("landing.hero.titleHighlight")}
        </span>{" "}
        {t("landing.hero.title2")}
      </h1>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" asChild className="gap-2">
          <Link href="/app">
            {t("landing.hero.ctaPrimary")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
