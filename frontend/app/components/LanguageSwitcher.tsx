"use client"

import { useLanguage } from "../context/LanguageContext"
import { Globe } from "lucide-react"

export function LanguageSwitcher() {
  const { language, setLanguage, languages, languageNames } = useLanguage()

  return (
    <div className="flex items-center gap-1.5">
      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as typeof language)}
        className="h-7 px-1.5 rounded border bg-background text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {languages.map((lang) => (
          <option key={lang} value={lang}>
            {languageNames[lang]}
          </option>
        ))}
      </select>
    </div>
  )
}
