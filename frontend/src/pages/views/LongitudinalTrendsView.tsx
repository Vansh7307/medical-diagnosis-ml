import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MetricCard } from '../../components/MetricCard'

export default function LongitudinalTrendsView() {
  const trendData = useMemo(() => [
    { date: 'Jan', glucose: 95, hba1c: 5.3, wbc: 7.2, creatinine: 0.9, risk_score: 12 },
    { date: 'Feb', glucose: 105, hba1c: 5.5, wbc: 7.8, creatinine: 0.95, risk_score: 18 },
    { date: 'Mar', glucose: 115, hba1c: 5.7, wbc: 8.1, creatinine: 1.0, risk_score: 24 },
    { date: 'Apr', glucose: 125, hba1c: 5.9, wbc: 8.4, creatinine: 1.05, risk_score: 32 },
    { date: 'May', glucose: 135, hba1c: 6.2, wbc: 8.7, creatinine: 1.1, risk_score: 41 },
    { date: 'Jun', glucose: 140, hba1c: 6.5, wbc: 9.0, creatinine: 1.15, risk_score: 51 },
  ], [])

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <p className="eyebrow">Patient Analytics</p>
        <h1 className="text-3xl font-bold text-white">Longitudinal Trends & Disease Progression</h1>
        <p className="text-slate-400 mt-2">Multi-axis time-series charts tracking patient biomarkers across months/years with automated trend analysis and risk trajectory projection</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Patients Tracked" value={3847} accent="#22d3ee" />
        <MetricCard label="Avg Follow-up" value="6.2 mo" accent="#34d399" />
        <MetricCard label="Deterioration" value={234} accent="#f97316" />
        <MetricCard label="Interventions" value={87} accent="#a78bfa" />
      </div>

      {/* 6-Month Trend Chart - Glucose & HbA1c */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">📊 Glucose & HbA1c Trend (6 Months)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="glucose" stroke="#ef4444" strokeWidth={2} name="Glucose (mg/dL)" />
              <Line yAxisId="right" type="monotone" dataKey="hba1c" stroke="#f97316" strokeWidth={2} name="HbA1c (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Kidney Function Decline */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">🫘 Kidney Function Decline (eGFR, Creatinine)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="creatinine" stroke="#ef4444" strokeWidth={2} name="Creatinine (mg/dL)" />
              <Line type="monotone" dataKey="wbc" stroke="#a78bfa" strokeWidth={2} name="WBC (K/uL)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Overall Risk Score Trajectory */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">⚠️ Overall Disease Risk Score Trajectory</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="risk_score"
                stroke="#ef4444"
                strokeWidth={3}
                name="Risk Score (0-100)"
                dot={{ fill: '#ef4444', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-300 font-semibold">⚠️ DETERIORATING TREND DETECTED</p>
          <p className="text-xs text-slate-300 mt-1">Risk score has increased 42% over 6 months. Recommend clinical review and treatment adjustment.</p>
        </div>
      </div>

      {/* Biomarker Status Comparison */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">📈 Biomarker Status Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left py-2 px-3 text-slate-300 font-semibold">Biomarker</th>
                <th className="text-center py-2 px-3 text-slate-300 font-semibold">Baseline</th>
                <th className="text-center py-2 px-3 text-slate-300 font-semibold">Latest</th>
                <th className="text-center py-2 px-3 text-slate-300 font-semibold">Change %</th>
                <th className="text-center py-2 px-3 text-slate-300 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { biomarker: 'Glucose (mg/dL)', baseline: 95, latest: 140, change: '+47%', status: '⚠️ Critical' },
                { biomarker: 'HbA1c (%)', baseline: 5.3, latest: 6.5, change: '+23%', status: '⚠️ Worsening' },
                { biomarker: 'Creatinine (mg/dL)', baseline: 0.9, latest: 1.15, change: '+28%', status: '⚠️ Worsening' },
                { biomarker: 'WBC (K/uL)', baseline: 7.2, latest: 9.0, change: '+25%', status: '⚠️ Elevated' },
              ].map((item) => (
                <tr key={item.biomarker} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-white font-medium">{item.biomarker}</td>
                  <td className="py-3 px-3 text-center text-cyan-400">{item.baseline}</td>
                  <td className="py-3 px-3 text-center text-red-400 font-semibold">{item.latest}</td>
                  <td className="py-3 px-3 text-center text-red-400 font-semibold">{item.change}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300">{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clinical Actions Recommended */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">🎯 Recommended Clinical Actions</h3>
        <div className="space-y-3">
          {[
            { action: 'Urgent endocrinology consult', priority: 'CRITICAL', icon: '🔴' },
            { action: 'Adjust diabetes medication regimen', priority: 'HIGH', icon: '🟠' },
            { action: 'Monitor kidney function weekly', priority: 'HIGH', icon: '🟠' },
            { action: 'Increase patient follow-up frequency', priority: 'MEDIUM', icon: '🟡' },
          ].map((item) => (
            <div
              key={item.action}
              className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                item.priority === 'CRITICAL'
                  ? 'border-red-500 bg-red-500/10'
                  : item.priority === 'HIGH'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-yellow-500 bg-yellow-500/10'
              }`}
            >
              <span className="text-sm text-slate-300">{item.action}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                item.priority === 'CRITICAL' ? 'bg-red-500/30 text-red-300' :
                item.priority === 'HIGH' ? 'bg-orange-500/30 text-orange-300' :
                'bg-yellow-500/30 text-yellow-300'
              }`}>
                {item.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
