import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { analyticsAPI } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Dashboard() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setFailed(false)
    analyticsAPI.dashboard()
      .then(res => setData(res.data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // The backend can be slow to wake up after sitting idle (free-tier cold
  // start). Rather than show a permanent error after one failed attempt,
  // retry automatically a couple of times with a short delay.
  const [retryCount, setRetryCount] = useState(0)
  useEffect(() => {
    if (failed && retryCount < 2) {
      const t = setTimeout(() => {
        setRetryCount(c => c + 1)
        load()
      }, 4000)
      return () => clearTimeout(t)
    }
  }, [failed, retryCount, load])

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  }

  if (!data) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Dashboard</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p className="mb-2">
            Unable to load dashboard data. The backend may be waking up from being idle — this can take up to a minute.
          </p>
          <button
            onClick={() => { setRetryCount(0); load() }}
            className="text-sm font-medium bg-yellow-100 hover:bg-yellow-200 px-3 py-1.5 rounded-lg border border-yellow-300"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (data.role_view === 'patient') {
    return <PatientDashboard data={data} />
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

  const avgConfidencePct = (Object.values(data.confidence_by_type || {}) as number[]).reduce((a: number, b: number) => a + b, 0) / Math.max(Object.keys(data.confidence_by_type || {}).length, 1) * 100

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">Clinic-wide overview, live from the diagnosis pipeline</p>
        </div>
        <span className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Patients" value={data.total_patients as number} accent="#0d9488" />
        <MetricCard label="Total Diagnoses" value={data.total_diagnoses as number} accent="#3b82f6" />
        <MetricCard label="Models Active" value={modelMetrics.filter(m => m.trained).length} accent="#8b5cf6" />
        <GaugeCard label="Avg Confidence" percent={avgConfidencePct} accent="#f59e0b" />
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

/** Dashboard shown to a patient-role login: only their own data, never the clinic-wide view. */
function PatientDashboard({ data }: { data: Record<string, unknown> }) {
  const linked = data.linked as boolean
  const patient = data.patient as Record<string, unknown> | undefined
  const recentDiagnoses = (data.recent_diagnoses || []) as Array<Record<string, unknown>>

  if (!linked) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Welcome</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-900 max-w-xl">
          <p className="mb-2">Your account isn't linked to a patient record yet.</p>
          <p className="text-sm">
            This usually connects automatically if you register with the same email your clinic has on file.
            If you believe this is a mistake, ask the clinic to check your record.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-1">
        Welcome, {patient?.first_name as string}
      </h2>
      <p className="text-slate-500 mb-6">
        Patient Code: <span className="font-mono">{patient?.patient_id as string}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <MetricCard label="Your Total Reports" value={data.total_diagnoses as number} accent="#0d9488" />
        <MetricCard
          label="Report Types"
          value={Object.keys(data.diagnosis_by_type || {}).length}
          accent="#8b5cf6"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Your Recent Reports</h3>
          <Link to="/diagnosis/history" className="text-sm text-blue-600 hover:underline">
            View all history →
          </Link>
        </div>
        {recentDiagnoses.length === 0 ? (
          <p className="text-slate-500 text-sm">No reports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Type</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Result</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Confidence</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentDiagnoses.map((d) => (
                  <tr key={d.id as number} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 capitalize">{d.diagnosis_type as string}</td>
                    <td className="py-2 px-3">{d.prediction as string}</td>
                    <td className="py-2 px-3">{((d.confidence as number) * 100).toFixed(1)}%</td>
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

function MetricCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 pl-5 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accent }} />
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1.5 text-slate-900">{value}</p>
    </div>
  )
}

function GaugeCard({ label, percent, accent }: { label: string; percent: number; accent: string }) {
  const clamped = Math.max(0, Math.min(100, percent || 0))
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-4">
      <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="7" />
        <circle
          cx="32" cy="32" r={radius} fill="none" stroke={accent} strokeWidth="7"
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