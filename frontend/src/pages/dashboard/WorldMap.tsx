import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  MouseEvent,
  KeyboardEvent,
  FocusEvent,
} from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from '@vnedyalk0v/react19-simple-maps'
import * as d3Scale from 'd3-scale'
import { useLanguage } from '../../hooks/useLanguage'
import { Globe, ShieldAlert, Radio, HelpCircle, X } from 'lucide-react'
import { API_BASE_URL } from '../../config'
import geoData from '../../assets/continents-optimized.json'

interface IRegionStats {
  id: string
  name: string
  percentage: number
  hasCertificate: boolean
}

interface IGisData {
  regions: Record<string, IRegionStats>
  globalFullStack: boolean
}

interface ITooltipState {
  visible: boolean
  x: number
  y: number
  content: React.ReactNode | null
  isMobileModal: boolean
  isHoveredByMouse: boolean
}

// Fixed colorScale generic mapping signature
const colorScale = d3Scale
  .scaleLinear<string>()
  .domain([0, 30, 99, 100])
  .range(['#0f172a', '#047857', '#0d9488', '#10b981'])

const topoJsonIdMap: Record<string, string> = {
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
  const [gisData, setGisData] = useState<IGisData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<boolean>(false)

  const [tooltip, setTooltip] = useState<ITooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
    isMobileModal: false,
    isHoveredByMouse: false,
  })
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/progress/geo-stats`)
      .then((res) => {
        if (!res.ok) throw new Error('GIS Link Offline')
        return res.json()
      })
      .then((data: unknown) => {
        setGisData(data as IGisData)
        setLoading(false)
      })
      .catch((err: Error) => {
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

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (
      !mapContainerRef.current ||
      tooltip.isMobileModal ||
      !tooltip.isHoveredByMouse
    )
      return
    const bounds = mapContainerRef.current.getBoundingClientRect()
    const relativeX = e.clientX - bounds.left
    const relativeY = e.clientY - bounds.top
    const offsetY = relativeY > bounds.height / 2 ? -75 : 12

    setTooltip((prev) => ({
      ...prev,
      x: relativeX + 12,
      y: relativeY + offsetY,
    }))
  }

  const handleRegionLeave = () => {
    if (tooltip.isMobileModal) return
    setTooltip((prev) => ({
      ...prev,
      visible: false,
      content: null,
      isHoveredByMouse: false,
    }))
  }

  const handleRegionTrigger = (regionId: string, e?: any) => {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation()
      if (typeof e.preventDefault === 'function') e.preventDefault()
    }

    const isKeyboardFocus =
      e && e.type === 'focus' && (!e.pointerType || e.pointerType === '')
    const isDesktop = window.innerWidth >= 1280
    const isMouseEnter = e && e.type === 'mouseenter'
    const shouldUseMobileModal =
      e &&
      (e.pointerType === 'touch' ||
        (e.type === 'click' && !isDesktop) ||
        (!isDesktop && isKeyboardFocus) ||
        window.innerWidth < 1280)

    let content: React.ReactNode = null
    if (regionId === 'secret_island') {
      content = (
        <div className="font-mono text-[11px] tracking-wide text-slate-200">
          <strong className="font-bold text-emerald-400">
            {t.fullStackIslandSecretTitle}
          </strong>
          <div className="mt-1 text-slate-400">
            {t.fullStackIslandSecretProgress}: {trackingMetrics.earned} / 7
          </div>
        </div>
      )
    } else {
      const r = gisData?.regions?.[regionId]
      if (!r) return
      const tech = t[`region_${r.id}`] || ''
      content = (
        <div className="font-mono text-[11px] tracking-wide text-slate-200">
          <strong className="mb-1 block border-b border-slate-800/80 pb-1 font-bold text-emerald-400">
            ⚡ {t.mapTooltipTerritory}: {r.name}
          </strong>
          <div className="leading-relaxed text-slate-400">{tech}</div>
          <div className="mt-1.5 border-t border-slate-800/60 pt-1 text-[10px]">
            {r.hasCertificate ? (
              <span className="font-bold text-emerald-400">
                {t.mapTooltipSynced}: 100%
              </span>
            ) : (
              <span className="text-amber-400">
                {t.mapTooltipExplored}: {r.percentage}%
              </span>
            )}
          </div>
        </div>
      )
    }

    if (shouldUseMobileModal) {
      setTooltip({
        visible: true,
        x: 0,
        y: 0,
        content,
        isMobileModal: true,
        isHoveredByMouse: false,
      })
    } else {
      const targetCenter = continentCenters.find((c) => c.id === regionId)
      let keyboardX = 20
      let keyboardY = 50

      if (targetCenter) {
        const long = targetCenter.coordinates[0]
        const lat = targetCenter.coordinates[1]
        keyboardX = 400 + long * 2.2
        keyboardY = 185 - lat * 1.8
      }

      setTooltip((prev) => ({
        visible: true,
        x: isKeyboardFocus ? keyboardX : prev.x,
        y: isKeyboardFocus ? keyboardY : prev.y,
        content,
        isMobileModal: false,
        isHoveredByMouse: isMouseEnter
          ? true
          : isKeyboardFocus
            ? false
            : prev.isHoveredByMouse,
      }))
    }
  }

  const handleKeyDown = (
    regionId: string,
    e: KeyboardEvent<SVGPathElement>,
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleRegionTrigger(regionId, e)
    }
  }

  const handleMapBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setTooltip((prev) => ({ ...prev, visible: false, content: null }))
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-45 w-full flex-1 items-center justify-center rounded-xl border border-slate-800/60 bg-slate-900/20 backdrop-blur-md">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Radio className="h-5 w-5 animate-pulse text-emerald-500" />
          <p className="font-mono text-xs text-slate-400">{t.mapLoading}</p>
        </div>
      </div>
    )
  }

  if (error || !gisData) {
    return (
      <div className="flex min-h-45 w-full flex-1 items-center justify-center rounded-xl border border-rose-950/40 bg-rose-950/5 backdrop-blur-md">
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
      className="relative flex h-full min-h-55 w-full flex-col justify-between rounded-xl border border-slate-800/60 bg-slate-900/20 p-4 backdrop-blur-md sm:p-5"
      ref={mapContainerRef}
      onMouseMove={handleMouseMove}
      onBlur={handleMapBlur}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h3 className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-slate-400 uppercase sm:text-sm">
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
          <span className="hidden font-mono text-[10px] tracking-widest text-slate-400/80 uppercase sm:inline">
            • GIS Satellite Uplink Active
          </span>
        </div>
      </div>

      <div className="relative flex aspect-800/380 min-h-45 w-full flex-1 items-center justify-center overflow-hidden rounded-lg border border-slate-800/50 bg-slate-950/20 sm:aspect-auto">
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={
            {
              scale: 140,
              center: [0, 0],
              translate: [400, 185],
            } as any
          }
          width={800}
          height={380}
          className="h-full w-full border-none ring-0 outline-none select-none focus:ring-0 focus:outline-none active:outline-none"
        >
          <g
            transform="translate(0, 20)"
            className="border-none ring-0 outline-none focus:outline-none"
          >
            <Geographies
              geography={geoData}
              className="border-none ring-0 outline-none focus:outline-none"
            >
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
                      onMouseEnter={(e: any) =>
                        regionId && handleRegionTrigger(regionId, e)
                      }
                      onMouseLeave={handleRegionLeave}
                      onClick={(e: any) =>
                        regionId && handleRegionTrigger(regionId, e)
                      }
                      onFocus={(e: any) =>
                        regionId && handleRegionTrigger(regionId, e)
                      }
                      onBlur={handleRegionLeave}
                      onKeyDown={(e: any) =>
                        regionId && handleKeyDown(regionId, e)
                      }
                      tabIndex={regionId ? 0 : -1}
                      role="button"
                      aria-describedby={
                        tooltip.visible && regionId
                          ? 'gis-map-tooltip'
                          : undefined
                      }
                      className="focus:outline-none focus-visible:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] focus-visible:filter"
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
              tabIndex={0}
              role="button"
              aria-describedby={tooltip.visible ? 'gis-map-tooltip' : undefined}
              className={
                globalFullStack
                  ? 'cursor-pointer transition-all duration-500 hover:drop-shadow-[0_0_12px_rgba(52,211,153,0.7)] focus:stroke-[#6ee7b7] focus:outline-none'
                  : 'focus:stroke-[#047857] focus:outline-none'
              }
              onMouseEnter={(e) => handleRegionTrigger('secret_island', e)}
              onMouseLeave={handleRegionLeave}
              onClick={(e) => handleRegionTrigger('secret_island', e)}
              onFocus={(e) => handleRegionTrigger('secret_island', e)}
              onBlur={handleRegionLeave}
              onKeyDown={(e) => handleKeyDown('secret_island', e)}
            />

            {continentCenters.map((center) => {
              const targetRegion = regions[center.id]
              if (!targetRegion || !targetRegion.hasCertificate) return null
              return (
                <Marker key={center.id} coordinates={center.coordinates as any}>
                  <g
                    transform="translate(-8, -15) scale(0.85)"
                    className="pointer-events-none drop-shadow-[0_2px_10px_rgba(234,179,8,0.4)]"
                  >
                    <path
                      d="M6 2h12v4c0 2.21-1.79 4-4 4h-4c-2.21 0-4-1.79-4-4V2z"
                      fill="#eab308"
                      stroke="#020617"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M4 6a2 2 0 1 1 0-4h2v4H4zM20 6V2h2a2 2 0 1 1 0 4h-2z"
                      fill="#eab308"
                      stroke="#020617"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M12 10v4M10 14h4M8 18h8v2H8z"
                      stroke="#eab308"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                </Marker>
              )
            })}
          </g>
        </ComposableMap>

        {tooltip.visible && !tooltip.isMobileModal && (
          <div
            id="gis-map-tooltip"
            role="tooltip"
            aria-live="polite"
            style={{ left: tooltip.x, top: tooltip.y }}
            className="animate-fade-in pointer-events-none absolute z-50 hidden max-w-xs rounded-lg border border-slate-800 bg-slate-950/90 p-2.5 shadow-2xl backdrop-blur-md lg:block"
          >
            {tooltip.content}
          </div>
        )}

        {tooltip.visible && tooltip.isMobileModal && (
          <div
            id="gis-map-tooltip"
            role="dialog"
            aria-modal="true"
            aria-live="polite"
            className="animate-fade-in fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm xl:hidden"
            onClick={() =>
              setTooltip({
                visible: false,
                x: 0,
                y: 0,
                content: null,
                isMobileModal: false,
                isHoveredByMouse: false,
              })
            }
          >
            <div
              className="relative w-full max-w-xs rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() =>
                  setTooltip({
                    visible: false,
                    x: 0,
                    y: 0,
                    content: null,
                    isMobileModal: false,
                    isHoveredByMouse: false,
                  })
                }
                className="absolute top-3 right-3 cursor-pointer p-1 text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="pr-2">{tooltip.content}</div>
            </div>
          </div>
        )}
      </div>

      {isLegendOpen && (
        <div className="animate-fade-in absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-slate-950/80 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
                {t.mapLegendTitle}
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
                <span className="text-slate-400">{t.mapLegendOffline}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-5 rounded-xs bg-[#047857]" />
                <span className="text-slate-400">{t.mapLegendInit}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-5 rounded-xs bg-[#0d9488]" />
                <span className="text-slate-400">{t.mapLegendSyncing}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-5 rounded-xs bg-[#10b981]" />
                <span className="text-slate-400">{t.mapLegendComplete}</span>
              </div>
              <div className="flex items-center gap-3 border-t border-slate-800 pt-3">
                <div className="flex h-4 w-5 items-center justify-center">
                  <div className="h-2 w-2 animate-ping rounded-full bg-[#34d399]" />
                </div>
                <span className="font-semibold text-emerald-400">
                  {t.mapLegendTrophy}
                </span>
              </div>
              {globalFullStack && (
                <div className="mt-4 border-t border-slate-800 pt-3">
                  <a
                    href="https://freecodecamp.org"
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full cursor-pointer rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-center font-mono text-[11px] font-bold tracking-wider text-emerald-400 uppercase transition-all hover:border-emerald-400 hover:bg-emerald-500/20"
                  >
                    {t.mapLegendAccessBtn}
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
