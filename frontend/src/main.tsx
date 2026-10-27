import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'

// Initialize optimized QueryClient cluster for unified telemetric caching architectures
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent aggressive Atlas reads on view transitions
      retry: 1, // Limited re-tries for cloud environment infrastructure stability
      staleTime: 1000 * 60 * 5, // Cache entries stay fresh for 5 minutes boundary
    },
  },
})

// Enforce non-null assertion workflow since compiler expects element boundary validation
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
