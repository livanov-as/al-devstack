import { X } from 'lucide-react'

interface MapLegendProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  globalFullStack: boolean
  t: Record<string, any>
}

export default function MapLegend({
  isOpen,
  setIsOpen,
  globalFullStack,
  t,
}: MapLegendProps) {
  if (!isOpen) return null

  return (
    <div className="animate-fade-in absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-slate-950/80 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
            {t.mapLegendTitle}
          </h4>
          <button
            onClick={() => setIsOpen(false)}
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
  )
}
