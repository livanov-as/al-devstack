export const CertCard = ({ name, date, isRu }) => (
  <div className="group p-4 bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl transition-all hover:-translate-y-1">
    <div className="flex justify-between items-start">
      <h4 className="font-semibold text-slate-100 group-hover:text-blue-400 transition">{name}</h4>
      <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase">
        {isRu ? 'Проверено' : 'Verified'}
      </span>
    </div>
    <p className="text-xs text-slate-500 mt-2 font-mono">{date}</p>
  </div>
)
