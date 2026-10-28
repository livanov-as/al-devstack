import { X } from 'lucide-react'
import { ITooltipState, IGisData } from '../hooks/useWorldMap'

interface MapTooltipProps {
  tooltip: ITooltipState
  closeTooltip: () => void
  gisData: IGisData
  earnedCertsCount: number
  t: Record<string, any>
}

export default function MapTooltip({
  tooltip,
  closeTooltip,
  gisData,
  earnedCertsCount,
  t,
}: MapTooltipProps) {
  if (!tooltip.visible || !tooltip.activeRegionId) return null

  const regionId = tooltip.activeRegionId

  const renderContent = () => {
    if (regionId === 'secret_island') {
      return (
        <div className="font-mono text-[11px] tracking-wide text-slate-200">
          <strong className="font-bold text-emerald-400">
            {t.fullStackIslandSecretTitle}
          </strong>
          <div className="mt-1 text-slate-400">
            {t.fullStackIslandSecretProgress}: {earnedCertsCount} / 7
          </div>
        </div>
      )
    }

    const r = gisData?.regions?.[regionId]
    if (!r) return null
    const tech = t[`region_${r.id}`] || ''

    return (
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

  if (!tooltip.isMobileModal) {
    return (
      <div
        id="gis-map-tooltip"
        role="tooltip"
        aria-live="polite"
        style={{ left: tooltip.x, top: tooltip.y }}
        className="animate-fade-in pointer-events-none absolute z-50 hidden max-w-xs rounded-lg border border-slate-800 bg-slate-950/90 p-2.5 shadow-2xl backdrop-blur-md lg:block"
      >
        {renderContent()}
      </div>
    )
  }

  return (
    <div
      id="gis-map-tooltip"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      className="animate-fade-in fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm xl:hidden"
      onClick={closeTooltip}
    >
      <div
        className="relative w-full max-w-xs rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeTooltip}
          className="absolute top-3 right-3 cursor-pointer p-1 text-slate-500 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="pr-2">{renderContent()}</div>
      </div>
    </div>
  )
}
