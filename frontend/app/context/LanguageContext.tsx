"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react"

type Language = "en" | "ru"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, any> = {
  en: null,
  ru: null
}

const LanguageContext = createContext<LanguageContextType>({
  language: "ru",
  setLanguage: () => {},
  t: (key) => key
})

async function loadTranslations(lang: Language) {
  if (translations[lang]) return
  try {
    const response = await fetch(`/locales/${lang}.json`)
    translations[lang] = await response.json()
  } catch (e) {
    console.error('Failed to load translations:', e)
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem('language') as Language
      const lang = saved === 'en' || saved === 'ru' ? saved : 'ru'
      await loadTranslations(lang)
      setLanguageState(lang)
      setLoaded(true)
    }
    init()
  }, [])

  const setLanguage = useCallback(async (lang: Language) => {
    await loadTranslations(lang)
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }, [])

  const t = useCallback(
    (key: string): string => {
      console.log('t() called with key:', key, 'language:', language, 'translations:', translations[language])
      if (!translations[language]) {
        console.log('No translations loaded for', language)
        return key
      }
      const keys = key.split(".")
      let value: any = translations[language]
      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k]
        } else {
          console.log('Key not found:', k, 'in', value)
          return key
        }
      }
      console.log('Found translation:', value)
      return typeof value === 'string' ? value : key
    },
    [language]
  )

  if (!loaded) {
    return <>{children}</>
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
