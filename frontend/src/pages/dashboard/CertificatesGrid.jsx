import React, { useState, useEffect } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { Award, ExternalLink } from 'lucide-react'

export default function CertificatesGrid() {
  const { t } = useLanguage()
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:5000/api/certificates')
      .then((res) => {
        if (!res.ok) throw new Error('Certificates Link Offline')
        return res.json()
      })
      .then((data) => {
        if (Array.isArray(data)) setCerts(data)
        setLoading(false)
      })
      .catch((err) => {
        console.warn(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="h-48 w-full animate-pulse rounded-xl border border-slate-800/50 bg-slate-900/40" />
    )
  }

  const activeCerts = certs.filter((c) => c.slug && c.slug.endsWith('-v9'))
  const legacyCerts = certs.filter((c) => c.slug && !c.slug.endsWith('-v9'))

  return (
    // If empty, we enforce fixed height matching the empty design grid perfectly
    <div
      className={`flex w-full flex-col rounded-xl border border-slate-800/60 bg-slate-900/20 p-5 backdrop-blur-md ${
        certs.length === 0 ? 'h-40 justify-between' : 'space-y-5'
      }`}
    >
      {/* Component Header (Always stays at the top) */}
      <div className="flex shrink-0 items-center gap-2">
        <Award className="h-4 w-4 text-emerald-500" />
        <h3 className="font-mono text-sm font-bold tracking-wider text-slate-400 uppercase">
          {t.certificatesTitle}
        </h3>
      </div>

      {certs.length === 0 ? (
        // Flex-1 handles absolute mathematical vertical and horizontal centering inside the remaining space
        <div className="flex w-full flex-1 items-center justify-center pb-2">
          <p className="text-center font-mono text-xs tracking-wide text-slate-500 italic">
            {t.noCertificates}
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-4">
          {/* Active Full-Stack Architecture Block (v9 Curriculum) */}
          {activeCerts.length > 0 && (
            <div>
              <span className="mb-2 block font-mono text-[9px] font-bold tracking-widest text-emerald-500/70 uppercase">
                // Active Full-Stack Architecture (v9)
              </span>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {activeCerts.map((cert) => (
                  <a
                    key={cert._id || cert.id}
                    href={
                      cert.url && cert.url.startsWith('http')
                        ? cert.url
                        : `https://${cert.url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/40 p-3 transition-all duration-200 hover:border-emerald-500/30 hover:bg-emerald-950/5"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-mono text-xs font-semibold wrap-break-word text-slate-200 transition-colors group-hover:text-emerald-400">
                        {cert.title}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[9px] tracking-tight text-slate-500 uppercase">
                        {cert.slug}
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-colors group-hover:text-emerald-500" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Transferred Infrastructure Block (Legacy Curriculum) */}
          {legacyCerts.length > 0 && (
            <div className="border-t border-slate-900 pt-2">
              <span className="mb-2 block font-mono text-[9px] font-bold tracking-widest text-slate-500 uppercase">
                // Transferred Infrastructure (Legacy Curriculum)
              </span>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {legacyCerts.map((cert) => (
                  <a
                    key={cert._id || cert.id}
                    href={
                      cert.url && cert.url.startsWith('http')
                        ? cert.url
                        : `https://${cert.url}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between rounded-lg border border-slate-800/40 bg-slate-950/10 p-3 transition-all duration-200 hover:border-slate-700/60 hover:bg-slate-900/20"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-mono text-xs font-medium wrap-break-word text-slate-400 transition-colors group-hover:text-slate-300">
                        {cert.title}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[9px] tracking-tight text-slate-600 uppercase">
                        {cert.slug}
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-700 transition-colors group-hover:text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
