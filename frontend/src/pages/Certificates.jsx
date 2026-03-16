import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

export default function Certificates() {
  const [certs, setCerts] = useLocalStorage('al_certs', [
    { id: 1, name: "Responsive Web Design", url: "https://freecodecamp.org", date: "2023" }
  ])
  
  const [newCert, setNewCert] = useState({ name: '', url: '' })

  const addCert = (e) => {
    e.preventDefault()
    if (!newCert.name) return
    setCerts([...certs, { ...newCert, id: Date.now(), date: new Date().getFullYear().toString() }])
    setNewCert({ name: '', url: '' })
  }

  const deleteCert = (id) => {
    setCerts(certs.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* Форма добавления */}
      <form onSubmit={addCert} className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-50 space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Course Name</label>
          <input 
            value={newCert.name}
            onChange={e => setNewCert({...newCert, name: e.target.value})}
            className="w-full bg-slate-800/50 border border-slate-700 p-3 rounded-xl focus:outline-none focus:border-blue-500/50 transition text-sm"
            placeholder="JS Algorithms..."
          />
        </div>
        <div className="flex-1 min-w-50 space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Verify URL</label>
          <input 
            value={newCert.url}
            onChange={e => setNewCert({...newCert, url: e.target.value})}
            className="w-full bg-slate-800/50 border border-slate-700 p-3 rounded-xl focus:outline-none focus:border-blue-500/50 transition text-sm text-blue-400"
            placeholder="https://..."
          />
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 h-11 rounded-xl font-bold transition shadow-lg shadow-blue-900/20">
          ADD
        </button>
      </form>

      {/* Список карточек */}
      <div className="grid md:grid-cols-2 gap-4">
        {certs.map(cert => (
          <div key={cert.id} className="group relative p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-blue-500/40 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-slate-200 group-hover:text-blue-400 transition">{cert.name}</h4>
                <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase">{cert.date}</p>
              </div>
              <button 
                onClick={() => deleteCert(cert.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition"
              >
                ✕
              </button>
            </div>
            <a 
              href={cert.url} 
              target="_blank" 
              rel="noreferrer"
              className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg inline-block hover:bg-blue-500 hover:text-white transition"
            >
              View Certificate
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
