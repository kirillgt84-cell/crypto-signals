"use client"

import { useLanguage } from "../context/LanguageContext"
import { Button } from "@/components/ui/button"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-1">
      <Button 
        variant={language === "ru" ? "default" : "outline"} 
        size="sm" 
        onClick={() => setLanguage("ru")}
        className="px-2"
      >
        RU
      </Button>
      <Button 
        variant={language === "en" ? "default" : "outline"} 
        size="sm"
        onClick={() => setLanguage("en")}
        className="px-2"
      >
        EN
      </Button>
    </div>
  )
}
