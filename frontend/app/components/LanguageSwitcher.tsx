"use client"

import { useLanguage } from "../context/LanguageContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Check, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

export function LanguageSwitcher() {
  const { language, setLanguage, languages, languageNames, languageFlags } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1.5 px-2 text-xs font-semibold tracking-wide",
            "hover:bg-white/10 hover:text-foreground",
            "focus-visible:ring-1 focus-visible:ring-ring"
          )}
        >
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="mr-0.5">{languageFlags[language]}</span>
          <span className="uppercase">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="w-44 p-1.5 bg-popover/95 backdrop-blur-sm border-border/50"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm cursor-pointer",
              "hover:bg-accent focus:bg-accent",
              language === lang && "bg-accent/60 font-medium"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base leading-none">{languageFlags[lang]}</span>
              <span>{languageNames[lang]}</span>
            </div>
            {language === lang && (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
