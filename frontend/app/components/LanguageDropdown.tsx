"use client"

import { cn } from "@/lib/utils"
import { useLanguage } from "../context/LanguageContext"

export function LanguageDropdown() {
  const { language, setLanguage, languages } = useLanguage()

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border/50 bg-muted/40 p-0.5">
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
            language === lang
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
