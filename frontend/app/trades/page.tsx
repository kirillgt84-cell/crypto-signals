"use client"

import { ArrowLeft, Construction } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useLanguage } from "../context/LanguageContext"

export default function TradesPage() {
  const { t } = useLanguage()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <Construction className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">{t("userMenu.myTrades")}</h1>
      <p className="text-muted-foreground text-center max-w-md">
        {t("trades.comingSoon")}
      </p>
      <Link href="/">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("dashboard.backToTrading")}
        </Button>
      </Link>
    </div>
  )
}
