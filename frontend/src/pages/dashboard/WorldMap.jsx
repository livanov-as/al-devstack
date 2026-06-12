import React, { useState, useEffect } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { Globe, ShieldAlert, Radio } from 'lucide-react'

/**
 * Determines the color scheme based on region synchronization status.
 * Colors adapt to Tailwind v4 theme specs.
 */
const getRegionColor = (percentage, hasCert) => {
  if (hasCert) return 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
  if (percentage > 50) return 'bg-teal-600/5 border-teal-500/40 text-teal-400'
  if (percentage > 0) return 'bg-amber-600/5 border-amber-500/30 text-amber-400'
  return 'bg-slate-950/40 border-slate-800/80 text-slate-500'
}

export default function WorldMap() {
  const { t } = useLanguage()
  const [gisData, setGisData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hoveredRegion, setHoveredRegion] = useState(null)

  useEffect(() => {
    fetch('http://localhost:5000/api/progress/geo-stats')
      .then((res) => {
        if (!res.ok) throw new Error('GIS Link Offline')
        return res.json()
      })
      .then((data) => {
        setGisData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.warn(err.message)
        setError(true)
        setLoading(false)
      })
  }, [])

  // Loading Phase (Centered and fully expanded to match layout height)
  if (loading) {
    return (
      <div className="flex h-full min-h-75 w-full flex-1 items-center justify-center rounded-xl border border-slate-800/60 bg-slate-900/20 py-12 backdrop-blur-md">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Radio className="h-5 w-5 animate-pulse text-emerald-500" />
          <p className="font-mono text-xs text-slate-400">{t.mapLoading}</p>
        </div>
      </div>
    )
  }

  // Error Fallback Phase (Centered and fully expanded to match layout height)
  if (error || !gisData) {
    return (
      <div className="flex h-full min-h-75 w-full flex-1 items-center justify-center rounded-xl border border-rose-950/40 bg-rose-950/5 py-12 backdrop-blur-md">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <ShieldAlert className="h-5 w-5 text-rose-500" />
          <p className="font-mono text-xs text-rose-400">{t.mapError}</p>
        </div>
      </div>
    )
  }

  const { regions, globalFullStack } = gisData

  return (
    <div className="flex w-full flex-1 flex-col justify-between rounded-xl border border-slate-800/60 bg-slate-900/20 p-5 backdrop-blur-md">
      {/* Component Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-mono text-sm font-bold tracking-wider text-slate-400 uppercase">
          <Globe className="h-4 w-4 text-emerald-500" />
          {t.worldMapTitle}
        </h3>
        <span className="animate-pulse font-mono text-[10px] tracking-widest text-slate-500 uppercase">
          • GIS Satellite Uplink Active
        </span>
      </div>

      {/* Interactive GIS Grid Layout for 6 Continents */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(regions).map((region) => {
          const isHovered = hoveredRegion === region.id
          const cardStyle = getRegionColor(
            region.percentage,
            region.hasCertificate,
          )

          return (
            <div
              key={region.id}
              onMouseEnter={() => setHoveredRegion(region.id)}
              onMouseLeave={() => setHoveredRegion(null)}
              className={`relative flex cursor-crosshair flex-col justify-between rounded-lg border p-3.5 transition-all duration-200 select-none ${cardStyle} ${
                isHovered
                  ? 'scale-[1.01] border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.03)]'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="block font-mono text-[9px] tracking-wider uppercase opacity-50">
                    {t.mapTooltipTerritory}
                  </span>
                  <span className="block truncate font-mono text-xs font-bold tracking-wide">
                    {region.name}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-mono text-xs font-black">
                    {region.hasCertificate ? '100%' : `${region.percentage}%`}
                  </span>
                </div>
              </div>

              {/* Progress Bar Indicator */}
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full border border-slate-900 bg-slate-950/60">
                <div
                  className={`h-full transition-all duration-500 ${
                    region.hasCertificate
                      ? 'bg-emerald-400'
                      : 'bg-emerald-500/70'
                  }`}
                  style={{ width: `${region.percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* THE CORE: Global Full-Stack Trigger Island */}
      <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-lg border border-dashed border-slate-800 bg-slate-950/30 p-4 sm:flex-row">
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <div className="relative flex h-3.5 w-3.5 shrink-0">
            {globalFullStack ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border border-slate-700 bg-slate-800"></span>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="truncate font-mono text-xs font-bold text-slate-300">
              {t.fullStackIslandTitle}
            </h4>
            <p className="mt-0.5 font-mono text-[11px] wrap-break-word text-slate-500">
              {globalFullStack
                ? t.fullStackIslandActive
                : t.fullStackIslandLocked}
            </p>
          </div>
        </div>

        {globalFullStack && (
          <a
            href="https://freecodecamp.org"
            target="_blank"
            rel="noreferrer"
            className="w-full shrink-0 cursor-pointer rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-center font-mono text-[11px] font-bold tracking-wider text-emerald-400 uppercase transition-all hover:border-emerald-400 hover:bg-emerald-500/20 active:scale-95 sm:w-auto"
          >
            Access Core URL
          </a>
        )}
      </div>

      {/* Dynamic Cybersecurity Information Matrix Tooltip Panel */}
      <div className="mt-4 flex items-center justify-center rounded-lg border border-slate-900 bg-slate-950/80 px-3 py-2 text-center">
        {hoveredRegion ? (
          (() => {
            const r = regions[hoveredRegion]
            const tech = t[`region_${r.id}`]
            return (
              <span className="animate-fade-in font-mono text-[11px] tracking-wide wrap-break-word text-slate-300">
                ⚡{' '}
                <strong className="text-emerald-400">
                  {t.mapTooltipTerritory} {r.name}
                </strong>
                : {tech} |{' '}
                {r.hasCertificate ? (
                  <span className="font-bold text-emerald-400">
                    {t.mapTooltipSynced} 100%
                  </span>
                ) : (
                  <span className="text-amber-400">
                    {t.mapTooltipExplored} {r.percentage}% ({r.completed}/
                    {r.total})
                  </span>
                )}
              </span>
            )
          })()
        ) : (
          <span className="py-0.5 font-mono text-[10px] tracking-widest text-slate-600 uppercase">
            Hover over a sector to scan local GIS data matrix
          </span>
        )}
      </div>
    </div>
  )
}
