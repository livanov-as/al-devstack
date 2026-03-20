import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { Award, ExternalLink, Trash2, Plus, GraduationCap } from 'lucide-react'

export default function Certificates() {
  const [certs, setCerts] = useLocalStorage('al_certs', [
    {
      id: 1,
      name: 'Responsive Web Design',
      url: 'https://freecodecamp.org',
      date: '2023',
    },
  ])

  const [newCert, setNewCert] = useState({ name: '', url: '' })

  const addCert = (e) => {
    e.preventDefault()
    if (!newCert.name) return
    setCerts([
      ...certs,
      {
        ...newCert,
        id: Date.now(),
        date: new Date().getFullYear().toString(),
      },
    ])
    setNewCert({ name: '', url: '' })
  }

  const deleteCert = (id) => {
    setCerts(certs.filter((c) => c.id !== id))
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-4 space-y-10 duration-700">
      <header>
        <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight">
          <GraduationCap className="text-blue-500" size={28} />
          My <span className="text-blue-500">Certificates</span>
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Подтвержденные достижения и курсы
        </p>
      </header>

      {/* Форма добавления */}
      <form
        onSubmit={addCert}
        className="flex flex-wrap items-end gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-md"
      >
        <div className="min-w-60 flex-1 space-y-2">
          <label className="ml-1 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Course Name
          </label>
          <input
            value={newCert.name}
            onChange={(e) => setNewCert({ ...newCert, name: e.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 p-3 text-sm transition focus:border-blue-500/50 focus:outline-none"
            placeholder="Напр: JavaScript Algorithms"
          />
        </div>
        <div className="min-w-60 flex-1 space-y-2">
          <label className="ml-1 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Verify URL
          </label>
          <input
            value={newCert.url}
            onChange={(e) => setNewCert({ ...newCert, url: e.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 p-3 text-sm text-blue-400 transition focus:border-blue-500/50 focus:outline-none"
            placeholder="https://freecodecamp.org..."
          />
        </div>
        <button className="flex h-11 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-8 font-bold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-500 active:scale-95">
          <Plus size={18} className="mr-2" /> ADD
        </button>
      </form>

      {/* Сетка сертификатов */}
      <div className="grid gap-4 md:grid-cols-2">
        {certs.map((cert) => (
          <div
            key={cert.id}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 transition-all hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/5"
          >
            <div className="flex justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                  <Award size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 transition group-hover:text-blue-400">
                    {cert.name}
                  </h4>
                  <p className="mt-1 font-mono text-[10px] text-slate-500 uppercase">
                    Issued: {cert.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteCert(cert.id)}
                className="cursor-pointer p-2 text-slate-600 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                title="Удалить"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold tracking-tighter text-emerald-500 uppercase">
                Verified
              </span>
              <a
                href={cert.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-blue-400 transition hover:text-blue-300"
              >
                View Certificate <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
