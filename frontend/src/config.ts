/**
 * Dynamic API Base URL configuration utilizing Vite environment variables.
 * Automatically falls back to relative routing proxy in production mode.
 */
export const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || '/api'
