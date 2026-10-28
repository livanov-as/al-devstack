import { Globe, ShieldAlert, Radio, HelpCircle } from 'lucide-react'
import { useWorldMap } from './hooks/useWorldMap'
import MapCanvas from './components/MapCanvas'
import MapTooltip from './components/MapTooltip'
import MapLegend from './components/MapLegend'

export default function WorldMap() {
  const {
    t,
    mapContainerRef,
    isLegendOpen,
    setIsLegendOpen,
    tooltip,
    gisData,
    isLoading,
    isError,
    trackingMetrics,
    handleMouseMove,
    handleRegionLeave,
    handleRegionTrigger,
    handleKeyDown,
    closeTooltip,
  } = useWorldMap()

  if (isLoading) {
    return (
      <div className="flex min-h-45 w-full flex-1 items-center justify-center rounded-xl border border-slate-800/60 bg-slate-900/20 backdrop-blur-md">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <Radio className="h-5 w-5 animate-pulse text-emerald-500" />
          <p className="font-mono text-xs text-slate-400">{t.mapLoading}</p>
        </div>
      </div>
    )
  }

  if (isError || !gisData) {
    return (
      <div className="flex min-h-45 w-full flex-1 items-center justify-center rounded-xl border border-rose-950/40 bg-rose-950/5 backdrop-blur-md">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <ShieldAlert className="h-5 w-5 text-rose-500" />
          <p className="font-mono text-xs text-rose-400">{t.mapError}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative flex h-full min-h-55 w-full flex-col justify-between rounded-xl border border-slate-800/60 bg-slate-900/20 p-4 backdrop-blur-md sm:p-5"
      ref={mapContainerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleRegionLeave}
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
        <MapCanvas
          gisData={gisData}
          trackingMetrics={trackingMetrics}
          handleRegionTrigger={handleRegionTrigger}
          handleRegionLeave={handleRegionLeave}
          handleKeyDown={handleKeyDown}
        />

        <MapTooltip
          tooltip={tooltip}
          closeTooltip={closeTooltip}
          gisData={gisData}
          earnedCertsCount={trackingMetrics.earned}
          t={t}
        />
      </div>

      <MapLegend
        isOpen={isLegendOpen}
        setIsOpen={setIsLegendOpen}
        globalFullStack={gisData.globalFullStack}
        t={t}
      />
    </div>
  )
}
