/**
 * Dynamic API Base URL Configuration
 *
 * Automatically switches between local development server and Vercel production proxy.
 * Prevents hardcoded environment leaks and solves CORS issues seamlessly.
 */
export const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api' // Local fallback for development environment
    : '/api' // Production relative path handled by Vercel reverse proxy
