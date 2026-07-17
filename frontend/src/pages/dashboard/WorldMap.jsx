import React, { useState, useEffect } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
} from '@vnedyalk0v/react19-simple-maps'
import { scaleLinear } from 'd3-scale'
import { useLanguage } from '../../hooks/useLanguage'
import { Globe, ShieldAlert, Radio } from 'lucide-react'
import { API_BASE_URL } from '../../config'
// Import TopoJSON directly as a structured JSON object
import geoData from '../../assets/continents-optimized.json'

/**
 * Generates dynamic color fill steps based on synchronization percentage.
 * Fully compatible with Tailwind v4 theme specs.
 */
const colorScale = scaleLinear().domain([0, 30, 70, 100]).range([
  '#0f172a', // 0% - Slate 950 deep core
  '#047857', // 1-30% - Emerald 700 early sync
  '#0d9488', // 31-99% - Teal 600 orbital telemetry
  '#10b981', // 100% - Pure Emerald complete sync
])

// Maps TopoJSON continent strings to internal database key structures
const topoJsonIdMap = {
  Europe: 'europe',
  Asia: 'asia',
  Africa: 'africa',
  'North America': 'north_america',
  'South America': 'south_america',
  Oceania: 'australia_oceania',
  Australia: 'australia_oceania',
}

export default function WorldMap() {
  const { t } = useLanguage()
  const [gisData, setGisData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hoveredRegion, setHoveredRegion] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/progress/geo-stats`)
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

  // Loading Phase (Centered and fully expanded to match layout limits)
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

  // Error Fallback Phase (Centered and fully expanded to match layout dimensions)
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
    <div className="flex h-full w-full flex-1 flex-col justify-between rounded-xl border border-slate-800/60 bg-slate-900/20 p-5 backdrop-blur-md">
      {/* Component Header Info */}
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <h3 className="flex items-center gap-2 font-mono text-sm font-bold tracking-wider text-slate-400 uppercase">
          <Globe className="h-4 w-4 text-emerald-500" />
          {t.worldMapTitle}
        </h3>
        <span className="animate-pulse font-mono text-[10px] tracking-widest text-slate-500 uppercase">
          • GIS Satellite Uplink Active
        </span>
      </div>

      {/* Expanded Interactive SVG GIS Vector Frame without restrictive boundaries */}
      <div className="relative flex min-h-95 w-full flex-1 items-center justify-center overflow-hidden rounded-lg border border-slate-800/50 bg-slate-950/20">
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 190 }} // Scale up continents significantly to fill horizontally
          width={800}
          height={350} // Tightened aspect ratio matrix for widespread landscape viewport
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full select-none"
        >
          <Geographies geography={geoData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const continentName =
                  geo.properties.CONTINENT || geo.properties.name
                const regionId = topoJsonIdMap[continentName]
                const regionStats = regions[regionId]

                const percentage = regionStats
                  ? regionStats.hasCertificate
                    ? 100
                    : regionStats.percentage
                  : 0

                const geoColor = colorScale(percentage)

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => regionId && setHoveredRegion(regionId)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    style={{
                      default: {
                        fill: geoColor,
                        stroke: '#1e293b',
                        strokeWidth: 0.5,
                        outline: 'none',
                        transition: 'all 250ms ease-in-out',
                      },
                      hover: {
                        fill: regionStats?.hasCertificate
                          ? '#34d399'
                          : '#0ea5e9',
                        stroke: '#64748b',
                        strokeWidth: 1,
                        outline: 'none',
                        cursor: 'crosshair',
                        filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.2))',
                        transition: 'all 150ms ease-in-out',
                      },
                      pressed: {
                        fill: '#059669',
                        stroke: '#1e293b',
                        strokeWidth: 0.5,
                        outline: 'none',
                      },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* THE CORE: Global Full-Stack Trigger Island Infrastructure */}
      <div className="mt-4 flex shrink-0 flex-col items-center justify-between gap-4 rounded-lg border border-dashed border-slate-800 bg-slate-950/30 p-4 sm:flex-row">
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
      <div className="mt-3 flex shrink-0 items-center justify-center rounded-lg border border-slate-900 bg-slate-950/80 px-3 py-2 text-center">
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
