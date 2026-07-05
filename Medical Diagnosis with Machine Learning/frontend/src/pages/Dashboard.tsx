import { useState, useEffect } from 'react'
import { analyticsAPI } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Dashboard() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsAPI.dashboard()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  }

  if (!data) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Dashboard</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Unable to load dashboard data. Make sure the backend API is running.
        </div>
      </div>
    )
  }

  const diagnosisTypeData = Object.entries(data.diagnosis_by_type || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    count: value as number,
  }))

  const modelMetrics = Object.entries(data.models || {}).map(([key, val]) => {
    const m = val as Record<string, unknown>
    const metrics = m.metrics as Record<string, number> | null
    return {
      name: key.charAt(0).toUpperCase() + key.slice(1),
      accuracy: metrics?.accuracy ? +(metrics.accuracy * 100).toFixed(1) : 0,
      f1: metrics?.f1_score ? +(metrics.f1_score * 100).toFixed(1) : 0,
      auc: metrics?.roc_auc ? +(metrics.roc_auc * 100).toFixed(1) : 0,
      trained: m.trained as boolean,
    }
  })

  const recentDiagnoses = (data.recent_diagnoses || []) as Array<Record<string, unknown>>

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Patients" value={data.total_patients as number} color="blue" />
        <StatCard label="Total Diagnoses" value={data.total_diagnoses as number} color="green" />
        <StatCard label="Models Active" value={modelMetrics.filter(m => m.trained).length} color="purple" />
        <StatCard
          label="Avg Confidence"
          value={`${((Object.values(data.confidence_by_type || {}) as number[]).reduce((a: number, b: number) => a + b, 0) / Math.max(Object.keys(data.confidence_by_type || {}).length, 1) * 100).toFixed(1)}%`}
          color="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Diagnosis Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Diagnoses by Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={diagnosisTypeData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {diagnosisTypeData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Model Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Model Performance (%)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={modelMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="accuracy" fill="#3b82f6" name="Accuracy" />
              <Bar dataKey="f1" fill="#10b981" name="F1 Score" />
              <Bar dataKey="auc" fill="#f59e0b" name="ROC AUC" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Diagnoses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Diagnoses</h3>
        {recentDiagnoses.length === 0 ? (
          <p className="text-slate-500 text-sm">No diagnoses recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-600">ID</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Type</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Prediction</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Confidence</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Risk Score</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentDiagnoses.map((d) => (
                  <tr key={d.id as number} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3">{d.id as number}</td>
                    <td className="py-2 px-3 capitalize">{d.diagnosis_type as string}</td>
                    <td className="py-2 px-3">{d.prediction as string}</td>
                    <td className="py-2 px-3">{((d.confidence as number) * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3">{d.risk_score ? `${(d.risk_score as number).toFixed(1)}%` : '-'}</td>
                    <td className="py-2 px-3 text-slate-500">{new Date(d.created_at as string).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-sm opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}
