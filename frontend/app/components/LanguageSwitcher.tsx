"use client"

import { useLanguage } from "../context/LanguageContext"
import { cn } from "@/lib/utils"

export function LanguageSwitcher() {
  const { language, setLanguage, languages, languageFlags } = useLanguage()

  return (
    <div className="flex items-center gap-1">
      {languages.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          title={lang.toUpperCase()}
          className={cn(
            "relative flex items-center justify-center rounded-md px-2 py-1.5 text-sm transition-all",
            "hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-ring",
            language === lang
              ? "bg-white/15 text-foreground font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="text-base leading-none">{languageFlags[lang]}</span>
        </button>
      ))}
    </div>
  )
}
