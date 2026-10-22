import { createContext } from 'react'

// Define explicit interface structure for the multilingual localization context state
export interface LanguageContextType {
  lang: string
  setLang: (lang: string) => void
  t: Record<string, any>
}

// Strictly typed context initialization initialized with a clean null fallback boundary
export const LanguageContext = createContext<LanguageContextType | null>(null)
