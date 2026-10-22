import { useContext } from 'react'
import {
  LanguageContext,
  LanguageContextType,
} from '../context/LanguageContext'

/**
 * Custom hook to safely consume the compiled multi-language context architecture
 */
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext)

  // Guard clause against running hook outside the required orchestration wrapper
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }

  return context
}
