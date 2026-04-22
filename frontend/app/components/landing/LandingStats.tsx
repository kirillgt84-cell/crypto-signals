"use client"

import { useLanguage } from "@/app/context/LanguageContext"

export function LandingStats() {
  const { t } = useLanguage()

  const stats = [
    { quantity: "10+", description: t("landing.stats.assets") },
    { quantity: "6", description: t("landing.stats.modules") },
    { quantity: "4", description: t("landing.stats.languages") },
    { quantity: "24/7", description: t("landing.stats.data") },
  ]

  return (
    <section className="container py-12">
      <div className="rounded-2xl border bg-muted/30 px-8 py-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map(({ quantity, description }) => (
            <div key={description} className="space-y-2 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-primary">{quantity}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
