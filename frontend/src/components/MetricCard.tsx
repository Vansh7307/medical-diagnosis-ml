export function MetricCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 pl-5 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accent }} />
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1.5 text-slate-900">{value}</p>
    </div>
  )
}

export function GaugeCard({ label, percent, accent, size = 64 }: { label: string; percent: number; accent: string; size?: number }) {
  const clamped = Math.max(0, Math.min(100, percent || 0))
  const radius = (size / 2) - 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="7" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={accent} strokeWidth="7"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1 text-slate-900">{clamped.toFixed(1)}%</p>
      </div>
    </div>
  )
}

/** Smaller gauge for dense grids (e.g. per-model accuracy in MLOps) */
export function MiniGauge({ label, percent, accent }: { label: string; percent: number; accent: string }) {
  const clamped = Math.max(0, Math.min(100, percent || 0))
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
      <svg width="36" height="36" viewBox="0 0 36 36" className="mx-auto -rotate-90">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx="18" cy="18" r={radius} fill="none" stroke={accent} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <p className="text-[11px] text-slate-500 mt-1.5">{label}</p>
      <p className="text-xs font-semibold text-slate-900">{clamped.toFixed(0)}%</p>
    </div>
  )
}