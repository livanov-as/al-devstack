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
        <nav className="max-w-5xl mx-auto p-6 flex gap-6 border-b">
          <Link to="/" className="hover:text-blue-500 transition font-black text-xs tracking-widest">DASHBOARD</Link>
          <Link to="/certs" className="hover:text-blue-500 transition font-black text-xs tracking-widest">CERTIFICATES</Link>
          
          <button 
            onClick={() => setIsDark(!isDark)} 
            className="ml-auto p-2 rounded-xl bg-slate-900/50 border hover:border-blue-500/50 transition cursor-pointer"
          >
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
