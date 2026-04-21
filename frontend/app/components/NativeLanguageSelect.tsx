"use client"

import { useLanguage } from "../context/LanguageContext"

export function NativeLanguageSelect() {
  const { language, setLanguage, languages, languageNames, languageFlags } = useLanguage()

  return (
    <select
      value={language}
      onChange={(e) => {
        console.log("[i18n] Language selected:", e.target.value)
        setLanguage(e.target.value as typeof language)
      }}
      className="h-8 px-2 rounded border bg-background text-sm cursor-pointer"
    >
      {languages.map((lang) => (
        <option key={lang} value={lang}>
          {languageFlags[lang]} {languageNames[lang]}
        </option>
      ))}
    </select>
  )
}
