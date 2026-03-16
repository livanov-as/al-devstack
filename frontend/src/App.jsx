import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Certificates from './pages/Certificates'

function App() {
  const [isDark, setIsDark] = useState(() => {
    // Сразу читаем тему из LocalStorage
    return localStorage.getItem('theme') === 'dark'
  })

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [isDark])

  return (
    <Router>
      <div className="min-h-screen transition-colors duration-500">
        <nav className="max-w-5xl mx-auto p-6 flex gap-6 border-b border-slate-800/50">
          <Link to="/" className="hover:text-blue-400 transition font-bold text-sm">DASHBOARD</Link>
          <Link to="/certs" className="hover:text-blue-400 transition font-bold text-sm">CERTIFICATES</Link>
          <button onClick={() => setIsDark(!isDark)} className="ml-auto opacity-70 hover:opacity-100">
            {isDark ? '🌙' : '☀️'}
          </button>
        </nav>

        <main className="max-w-5xl mx-auto p-6">
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
