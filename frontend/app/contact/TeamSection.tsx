"use client"

import { User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/app/context/LanguageContext"

const team = [
  { key: "ceo", initials: "AM", gradient: "from-indigo-500/20 to-purple-500/20" },
  { key: "cto", initials: "DK", gradient: "from-sky-500/20 to-cyan-500/20" },
  { key: "marketing", initials: "ES", gradient: "from-amber-500/20 to-orange-500/20" },
  { key: "support", initials: "MV", gradient: "from-emerald-500/20 to-teal-500/20" },
]

export function TeamSection() {
  const { t } = useLanguage()

  return (
    <div className="mt-12">
      <h2 className="text-lg font-semibold mb-6">{t("contact.teamTitle")}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {team.map((member) => (
          <Card key={member.key} className="text-center overflow-hidden">
            <CardContent className="pt-6 pb-6">
              <div
                className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${member.gradient} border-2 border-dashed border-primary/20`}
              >
                <User className="h-10 w-10 text-muted-foreground/60" />
              </div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {t("contact.team.placeholder")}
              </p>
              <h3 className="text-sm font-semibold">
                {t(`contact.team.${member.key}`)}
              </h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
