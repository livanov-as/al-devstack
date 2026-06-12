import React, { useState, useEffect } from 'react'
import { LanguageContext } from './LanguageContext'
import { translations } from './translations'

export default function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('al_lang') || 'en'
  })

  useEffect(() => {
    localStorage.setItem('al_lang', lang)
  }, [lang])

  const t = translations[lang]

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
