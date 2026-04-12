"use client"

import { useLanguage } from "../context/LanguageContext"
import { Button } from "@/components/ui/button"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  console.log('Current language:', language)

  return (
    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md">
      <Button 
        variant={language === "ru" ? "default" : "ghost"} 
        size="sm" 
        onClick={() => {
          console.log('Clicked RU')
          setLanguage("ru")
        }}
        className="px-2 h-7 text-xs font-bold"
      >
        RU
      </Button>
      <Button 
        variant={language === "en" ? "default" : "ghost"} 
        size="sm"
        onClick={() => {
          console.log('Clicked EN')
          setLanguage("en")
        }}
        className="px-2 h-7 text-xs font-bold"
      >
        EN
      </Button>
    </div>
  )
}
