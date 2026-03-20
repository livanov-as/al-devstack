import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Certificates from './pages/Certificates'

function App() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') !== 'light' // Dark по умолчанию
  })

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [isDark])

  return (
    <Router>
      <div className="min-h-screen">
        <nav className="mx-auto flex max-w-5xl gap-6 border-b p-6">
          <Link
            to="/"
            className="text-xs font-black tracking-widest transition hover:text-blue-500"
          >
            DASHBOARD
          </Link>
          <Link
            to="/certs"
            className="text-xs font-black tracking-widest transition hover:text-blue-500"
          >
            CERTIFICATES
          </Link>

          <button
            onClick={() => setIsDark(!isDark)}
            className="ml-auto cursor-pointer rounded-xl border bg-slate-900/50 p-2 transition hover:border-blue-500/50"
          >
            {isDark ? '🌙' : '☀️'}
          </button>
        </nav>

        <main className="mx-auto max-w-5xl p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/certs" element={<Certificates />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
