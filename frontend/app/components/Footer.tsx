"use client"

import Link from "next/link"
import { useLanguage } from "../context/LanguageContext"

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Mirkaso
            </Link>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              Precision analytics for crypto traders and investors.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">{t("footer.product")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/signals" className="hover:text-foreground transition-colors">{t("footer.signals")}</Link></li>
              <li><Link href="/macro" className="hover:text-foreground transition-colors">{t("footer.macro")}</Link></li>
              <li><Link href="/yield-curve" className="hover:text-foreground transition-colors">{t("footer.yieldCurve")}</Link></li>
              <li><Link href="/etf" className="hover:text-foreground transition-colors">{t("footer.etf")}</Link></li>
              <li><Link href="/heatmap" className="hover:text-foreground transition-colors">{t("footer.heatmap")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">{t("footer.company")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition-colors">{t("footer.about")}</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">{t("footer.contact")}</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors">{t("footer.faq")}</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground transition-colors">{t("footer.pricing")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">{t("footer.resources")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/learn" className="hover:text-foreground transition-colors">{t("footer.learn")}</Link></li>
              <li><Link href="/help" className="hover:text-foreground transition-colors">{t("footer.help")}</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">{t("footer.privacy")}</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">{t("footer.terms")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          {t("footer.copyright")}
        </div>
      </div>
    </footer>
  )
}
