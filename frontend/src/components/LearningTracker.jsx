export const LearningTracker = ({ title, progress, color = "bg-blue-500" }) => {
    return (
        <div className="p-5 bg-slate-900/40 border border-slate-800/50 rounded-2xl backdrop-blur-sm shadow-xl">
            <div className="flex justify-between items-end mb-3">
                <div>
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Course</p>
                    <h3 className="font-bold text-slate-200">{title}</h3>
                </div>
                <span className={`text-sm font-black ${color.replace('bg-', 'text-')} px-2 py-1 bg-white/5 rounded`}>
                    {progress}%
                </span>
            </div>

            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                    className={`${color} h-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(59,130,246,0.5)]`}
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    )
}
