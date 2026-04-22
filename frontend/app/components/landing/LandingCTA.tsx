"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/app/context/LanguageContext"

export function LandingCTA() {
  const { t } = useLanguage()

  return (
    <section className="container py-16 my-12">
      <div className="rounded-2xl bg-muted/50 border px-8 py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-bold">
          {t("landing.cta.title1")}{" "}
          <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
            {t("landing.cta.titleHighlight")}
          </span>{" "}
          {t("landing.cta.title2")}
        </h2>
        <p className="text-xl text-muted-foreground mt-4 mb-8 max-w-2xl mx-auto">
          {t("landing.cta.description")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="gap-2">
            <Link href="/app">
              {t("landing.cta.primary")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/contact">{t("landing.cta.secondary")}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
