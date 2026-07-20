import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from '@vnedyalk0v/react19-simple-maps'
import { scaleLinear } from 'd3-scale'
import { useLanguage } from '../../hooks/useLanguage'
import { Globe, ShieldAlert, Radio, HelpCircle, X } from 'lucide-react'
import { API_BASE_URL } from '../../config'
import geoData from '../../assets/continents-optimized.json'

const colorScale = scaleLinear().domain([0, 30, 70, 100]).range([
  '#0f172a', // 0% - Slate 950 deep core
  '#047857', // 1-30% - Emerald 700 early sync
  '#0d9488', // 31-99% - Teal 600 orbital telemetry
  '#10b981', // 100% - Pure Emerald complete sync
])

const topoJsonIdMap = {
  Europe: 'europe',
  Asia: 'asia',
  Africa: 'africa',
  'North America': 'north_america',
  'South America': 'south_america',
  Oceania: 'australia_oceania',
  Australia: 'australia_oceania',
}

const continentCenters = [
  { id: 'north_america', coordinates: [-100, 45], name: 'North America' },
  { id: 'south_america', coordinates: [-60, -20], name: 'South America' },
  { id: 'europe', coordinates: [20, 50], name: 'Europe' },
  { id: 'africa', coordinates: [20, 10], name: 'Africa' },
  { id: 'asia', coordinates: [100, 45], name: 'Asia' },
  { id: 'australia_oceania', coordinates: [135, -25], name: 'Oceania' },
]

export default function WorldMap() {
  const { t } = useLanguage()
  const [gisData, setGisData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  })
  const [isLegendOpen, setIsLegendOpen] = useState(false)
  const mapContainerRef = useRef(null)

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

  const trackingMetrics = useMemo(() => {
    if (!gisData || !gisData.regions)
      return { earned: 0, blurValue: 8, opacityValue: 0.1 }
    const totalCerts = Object.values(gisData.regions).filter(
      (r) => r.hasCertificate,
    ).length
    const blurValue = Math.max(0, 8 - totalCerts * 1.15)
    const opacityValue = Math.min(1, 0.1 + totalCerts * 0.13)
    return { earned: totalCerts, blurValue, opacityValue }
  }, [gisData])

  const handleMouseMove = (e) => {
    if (!mapContainerRef.current) return
    const bounds = mapContainerRef.current.getBoundingClientRect()
    const relativeX = e.clientX - bounds.left
    const relativeY = e.clientY - bounds.top

    // If cursor is near the bottom, flip tooltip upwards to prevent overflow
    const offsetY = relativeY > bounds.height / 2 ? -75 : 12

    setTooltip((prev) => ({
      ...prev,
      x: relativeX + 12,
      y: relativeY + offsetY,
    }))
  }

  const handleRegionLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false, content: null }))
  }

  const handleRegionHover = (regionId) => {
    if (regionId === 'secret_island') {
      const content = (
        <div className="font-mono text-[11px] tracking-wide text-slate-200">
          <strong className="font-bold text-emerald-400">
            🏝️ {t.fullStackIslandTitle || 'Secret Island'}
          </strong>
          <div className="mt-1 text-slate-400">
            Progression: {trackingMetrics.earned} / 7 Milestones
          </div>
          <div className="mt-1 border-t border-slate-800 pt-1 text-[10px] text-slate-500 uppercase">
            {globalFullStack ? 'Core System Unlocked' : 'Encrypted Frequency'}
          </div>
        </div>
      )
      setTooltip((prev) => ({ ...prev, visible: true, content }))
      return
    }

    const r = regions[regionId]
    if (!r) return
    const tech = t[`region_${r.id}`] || ''

    const content = (
      <div className="font-mono text-[11px] tracking-wide text-slate-200">
        <strong className="font-bold text-emerald-400">
          ⚡ {t.mapTooltipTerritory || 'Sector'}: {r.name}
        </strong>
        <div className="mt-1 text-slate-400">{tech}</div>
        <div className="mt-1 border-t border-slate-800 pt-1">
          {r.hasCertificate ? (
            <span className="font-bold text-emerald-400">
              {t.mapTooltipSynced || 'Synced'}: 100%
            </span>
          ) : (
            <span className="text-amber-400">
              {t.mapTooltipExplored || 'Explored'}: {r.percentage}% (
              {r.completed}/{r.total})
            </span>
          )}
        </div>
      </div>
    )
    setTooltip((prev) => ({ ...prev, visible: true, content }))
  }

  if (loading) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center rounded-xl border border-slate-800/60 bg-slate-900/20 backdrop-blur-md">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Radio className="h-5 w-5 animate-pulse text-emerald-500" />
          <p className="font-mono text-xs text-slate-400">{t.mapLoading}</p>
        </div>
      </div>
    )
  }

  if (error || !gisData) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center rounded-xl border border-rose-950/40 bg-rose-950/5 backdrop-blur-md">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <ShieldAlert className="h-5 w-5 text-rose-500" />
          <p className="font-mono text-xs text-rose-400">{t.mapError}</p>
        </div>
      </div>
    )
  }

  const { regions, globalFullStack } = gisData

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between rounded-xl border border-slate-800/60 bg-slate-900/20 p-5 backdrop-blur-md"
      ref={mapContainerRef}
      onMouseMove={handleMouseMove}
    >
      {/* Component Header Terminal Row */}
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h3 className="flex items-center gap-2 font-mono text-sm font-bold tracking-wider text-slate-400 uppercase">
          <Globe className="h-4 w-4 text-emerald-500" />
          {t.worldMapTitle}
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLegendOpen(true)}
            className="cursor-pointer text-slate-500 transition-colors hover:text-emerald-400"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <span className="animate-pulse font-mono text-[10px] tracking-widest text-slate-500 uppercase">
            • GIS Satellite Uplink Active
          </span>
        </div>
      </div>

      {/* Fully fluid scalable responsive vector workspace map canvas container */}
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-lg border border-slate-800/50 bg-slate-950/20">
        <ComposableMap
          projection="geoEqualEarth"
          // [400, 225] is the absolute optical center of our 800x380 viewport canvases shifted slightly down
          projectionConfig={{
            scale: 140,
            center: [0, 0],
            translate: [400, 225],
          }}
          width={800}
          height={380}
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
                    onMouseEnter={() => regionId && handleRegionHover(regionId)}
                    onMouseLeave={handleRegionLeave}
                    style={{
                      default: {
                        fill: geoColor,
                        stroke: '#1e293b',
                        strokeWidth: 0.5,
                        outline: 'none',
                        transition: 'all 250ms',
                      },
                      hover: {
                        fill: regionStats?.hasCertificate
                          ? '#34d399'
                          : '#0ea5e9',
                        stroke: '#64748b',
                        strokeWidth: 1,
                        outline: 'none',
                        cursor: 'crosshair',
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

          {/* THE SEED: Full-Stack Progressive Trigger Easter Egg Island Matrix */}
          <path
            d="M 170,290 C 175,285 185,285 190,292 C 195,298 188,308 180,305 C 172,302 165,295 170,290 Z"
            style={{
              fill: globalFullStack ? '#34d399' : '#10b981',
              stroke: globalFullStack ? '#6ee7b7' : '#047857',
              strokeWidth: 0.7,
              filter: `blur(${trackingMetrics.blurValue}px)`,
              opacity: trackingMetrics.opacityValue,
              transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            className={
              globalFullStack
                ? 'cursor-pointer transition-all duration-500 hover:drop-shadow-[0_0_12px_rgba(52,211,153,0.7)]'
                : ''
            }
            onMouseEnter={() => handleRegionHover('secret_island')}
            onMouseLeave={handleRegionLeave}
          />

          {/* Synchronized vector trophy badges */}
          {continentCenters.map((center) => {
            const targetRegion = regions[center.id]
            if (!targetRegion || !targetRegion.hasCertificate) return null

            return (
              <Marker key={center.id} coordinates={center.coordinates}>
                <g
                  transform="translate(-6, -12) scale(0.6)"
                  className="pointer-events-none transition-transform duration-300"
                >
                  <path
                    d="M6 2h12v4c0 2.21-1.79 4-4 4h-4c-2.21 0-4-1.79-4-4V2z"
                    fill="#34d399"
                  />
                  <path
                    d="M4 6a2 2 0 1 1 0-4h2v4H4zM20 6V2h2a2 2 0 1 1 0 4h-2z"
                    fill="#34d399"
                  />
                  <path
                    d="M12 10v4M10 14h4M8 18h8v2H8z"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </g>
              </Marker>
            )
          })}
        </ComposableMap>

        {/* Floating Tooltip Panel with absolute boundary capture */}
        {tooltip.visible && (
          <div
            style={{ left: tooltip.x, top: tooltip.y }}
            className="animate-fade-in pointer-events-none absolute z-50 max-w-xs rounded-lg border border-slate-800 bg-slate-950/90 p-2.5 shadow-2xl backdrop-blur-md"
          >
            {tooltip.content}
          </div>
        )}
      </div>

      {/* Embedded Modal Component Overlay for Legend Specs */}
      {isLegendOpen && (
        <div className="animate-fade-in absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
                GIS Matrix Legend
              </h4>
              <button
                onClick={() => setIsLegendOpen(false)}
                className="cursor-pointer text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-3">
                <div className="h-3 w-5 rounded-xs border border-slate-800 bg-[#0f172a]" />
                <span className="text-slate-400">0% — Core Offline</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-5 rounded-xs bg-[#047857]" />
                <span className="text-slate-400">
                  1 - 30% — Sync Initialized
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-5 rounded-xs bg-[#0d9488]" />
                <span className="text-slate-400">
                  31 - 99% — Sector Syncing
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-5 rounded-xs bg-[#10b981]" />
                <span className="text-slate-400">
                  100% — Full Sync Complete
                </span>
              </div>
              <div className="flex items-center gap-3 border-t border-slate-800 pt-3">
                <div className="flex h-4 w-5 items-center justify-center">
                  <div className="h-2 w-2 animate-ping rounded-full bg-[#34d399]" />
                </div>
                <span className="font-semibold text-emerald-400">
                  Trophy — Milestone Cleared
                </span>
              </div>

              {/* Core URL action moved beautifully directly into help info overlay context */}
              {globalFullStack && (
                <div className="mt-4 border-t border-slate-800 pt-3">
                  <a
                    href="https://freecodecamp.org"
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full cursor-pointer rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-center font-mono text-[11px] font-bold tracking-wider text-emerald-400 uppercase transition-all hover:border-emerald-400 hover:bg-emerald-500/20"
                  >
                    Access Core URL
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
