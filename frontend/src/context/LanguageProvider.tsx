import { useState, useEffect, ReactNode } from 'react'
import { LanguageContext, LanguageContextType } from './LanguageContext'
import { translations } from './translations'

// Explicit type layout definition for the multilingual wrapper props matrix
interface LanguageProviderProps {
  children: ReactNode
}

export default function LanguageProvider({ children }: LanguageProviderProps) {
  const [lang, setLang] = useState<string>(() => {
    return localStorage.getItem('al_lang') || 'en'
  })

  useEffect(() => {
    localStorage.setItem('al_lang', lang)
  }, [lang])

  // Resolve localized texts record map using standard static keys boundary
  const currentTranslations =
    translations[lang as keyof typeof translations] || translations['en']

  const contextValue: LanguageContextType = {
    lang,
    setLang,
    t: currentTranslations,
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}
