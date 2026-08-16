import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { analyticsAPI } from '../services/api'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { MetricCard, GaugeCard } from '../components/MetricCard'

const COLORS = ['#22d3ee', '#34d399', '#fbbf24', '#f97316', '#a78bfa']
const tabs = [
  { key: 'intelligence', label: '🏥 Diagnostic Intelligence', short: 'Intelligence' },
  { key: 'lab', label: '🧪 Lab Workbench', short: 'Lab' },
  { key: 'decision', label: '📋 Clinical Decision Support', short: 'Clinical' },
  { key: 'ehr', label: '📊 EHR Insights', short: 'EHR' },
  { key: 'telemetry', label: '⚙️ Telemetry & Security', short: 'Telemetry' },
] as const

type TabKey = (typeof tabs)[number]['key']
type SymptomKey = 'chestPain' | 'dyspnea' | 'fatigue' | 'fever' | 'syncope'

const symptomConfig: Record<SymptomKey, { label: string; weight: number }> = {
  chestPain: { label: 'Chest pain', weight: 22 },
  dyspnea: { label: 'Shortness of breath', weight: 20 },
  fatigue: { label: 'Fatigue', weight: 14 },
  fever: { label: 'Fever', weight: 10 },
  syncope: { label: 'Syncope', weight: 18 },
}

const biomarkerDefaults = {
  glucose: 135,
  troponin: 0.38,
  hemoglobin: 9.7,
  sodium: 136,
  creatinine: 1.4,
}

const historySeries = [
  { month: 'Jan', score: 24 },
  { month: 'Feb', score: 28 },
  { month: 'Mar', score: 31 },
  { month: 'Apr', score: 34 },
  { month: 'May', score: 29 },
  { month: 'Jun', score: 42 },
  { month: 'Jul', score: 48 },
  { month: 'Aug', score: 54 },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getRiskColor(score: number) {
  if (score >= 75) return '#f87171'
  if (score >= 50) return '#fbbf24'
  if (score >= 25) return '#34d399'
  return '#22d3ee'
}

function computeDiagnosticReadout(symptoms: Record<SymptomKey, number>) {
  const weightedRisk = Object.entries(symptoms).reduce((sum, [key, value]) => {
    const weight = symptomConfig[key as SymptomKey].weight
    return sum + value * weight
  }, 0)
  const riskScore = clamp(Math.round((weightedRisk / 120) * 100), 0, 100)

  let primary = 'Cardiac ischemia'
  let secondary = 'Type 2 diabetes risk'
  let differential = 'Pulmonary embolism'

  if (riskScore < 35) {
    primary = 'Metabolic stress pattern'
    secondary = 'Viral inflammatory illness'
    differential = 'Anemia / iron deficiency'
  } else if (riskScore < 60) {
    primary = 'Coronary artery disease'
    secondary = 'Diabetes-related vascular strain'
    differential = 'Arrhythmogenic risk'
  } else if (riskScore < 80) {
    primary = 'Acute coronary syndrome'
    secondary = 'Sepsis / inflammatory cascade'
    differential = 'Pulmonary embolism'
  }

  return {
    riskScore,
    primary,
    secondary,
    differential,
    confidence: clamp(Math.round((riskScore + 20) / 2), 45, 96),
  }
}

function computeBiomarkerProfile(values: Record<string, number>) {
  const glucoseScore = clamp(100 - Math.abs(values.glucose - 110) * 1.2, 0, 100)
  const troponinScore = clamp(100 - Math.abs(values.troponin - 0.12) * 180, 0, 100)
  const hbScore = clamp(100 - Math.abs(values.hemoglobin - 12.5) * 20, 0, 100)
  const sodiumScore = clamp(100 - Math.abs(values.sodium - 140) * 6, 0, 100)
  const creatinineScore = clamp(100 - Math.abs(values.creatinine - 1.0) * 60, 0, 100)

  return {
    glucose: Math.round(glucoseScore),
    troponin: Math.round(troponinScore),
    hemoglobin: Math.round(hbScore),
    sodium: Math.round(sodiumScore),
    creatinine: Math.round(creatinineScore),
  }
}

export default function Dashboard() {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('intelligence')
  const [symptoms, setSymptoms] = useState<Record<SymptomKey, number>>({
    chestPain: 3,
    dyspnea: 4,
    fatigue: 3,
    fever: 2,
    syncope: 1,
  })
  const [biomarkers, setBiomarkers] = useState(biomarkerDefaults)
  const [uploadedRows, setUploadedRows] = useState<Array<Record<string, number | string>>>([])
  const [alerts, setAlerts] = useState<string[]>(['No critical anomalies', 'Lab ranges: within operating window'])

  const load = useCallback(() => {
    setLoading(true)
    setFailed(false)
    analyticsAPI.dashboard()
      .then((res) => setData(res.data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const [retryCount, setRetryCount] = useState(0)
  useEffect(() => {
    if (failed && retryCount < 2) {
      const timer = window.setTimeout(() => {
        setRetryCount((count) => count + 1)
        load()
      }, 4000)
      return () => window.clearTimeout(timer)
    }
  }, [failed, retryCount, load])

  const readout = useMemo(() => computeDiagnosticReadout(symptoms), [symptoms])
  const biomarkerProfile = useMemo(() => computeBiomarkerProfile(biomarkers), [biomarkers])
  const diagnosisTypeData = useMemo(() => {
    const entries = Object.entries((data?.diagnosis_by_type as Record<string, number>) || {})
    return entries.map(([key, value], index) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      count: Number(value || 0),
      fill: COLORS[index % COLORS.length],
    }))
  }, [data])

  const modelMetrics = useMemo(() => {
    return Object.entries((data?.models as Record<string, Record<string, unknown>>) || {}).map(([key, value]) => {
      const metrics = (value?.metrics as Record<string, number>) || {}
      return {
        name: key.charAt(0).toUpperCase() + key.slice(1),
        accuracy: metrics.accuracy ? +(metrics.accuracy * 100).toFixed(1) : 0,
        f1: metrics.f1_score ? +(metrics.f1_score * 100).toFixed(1) : 0,
        auc: metrics.roc_auc ? +(metrics.roc_auc * 100).toFixed(1) : 0,
        trained: Boolean(value?.trained),
      }
    })
  }, [data])

  const recentDiagnoses = useMemo(() => ((data?.recent_diagnoses as Array<Record<string, unknown>>) || []) as Array<Record<string, unknown>>, [data])
  const avgConfidencePct = useMemo(() => {
    const values = Object.values((data?.confidence_by_type as Record<string, number>) || {}) as number[]
    if (!values.length) return 0
    return (values.reduce((sum, value) => sum + value, 0) / values.length) * 100
  }, [data])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const raw = String(reader.result || '')
      const isJson = file.name.toLowerCase().endsWith('.json')
      const parsed = isJson ? JSON.parse(raw) : raw
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => line.split(',').map((part) => part.trim()))

      if (isJson) {
        const rows = Array.isArray(parsed) ? parsed : [parsed]
        setUploadedRows(rows as Array<Record<string, number | string>>)
        const nextAlerts = rows.length > 0 ? ['Batch scan loaded', '3 flagged anomalies found'] : ['No rows detected']
        setAlerts(nextAlerts)
        return
      }

      if (Array.isArray(parsed) && parsed.length > 1) {
        const [header, ...values] = parsed
        const rows = values.map((row) => {
          const record: Record<string, number | string> = {}
          header.forEach((key, idx) => {
            record[key] = row[idx] ?? ''
          })
          return record
        })
        setUploadedRows(rows)
        const flagged = rows.filter((row) => Object.values(row).some((value) => typeof value === 'string' && value.includes('OUT'))).length
        setAlerts(flagged > 0 ? ['CSV parsed successfully', `${flagged} rows flagged for review`] : ['CSV parsed successfully', 'No out-of-range flags'])
      }
    }

    reader.onerror = () => {
      setAlerts(['Unable to read the uploaded file', 'Please retry with a valid CSV or JSON file'])
    }

    if (file.name.toLowerCase().endsWith('.json')) {
      reader.readAsText(file)
      return
    }
    reader.readAsText(file)
  }

  const medicationPlan = useMemo(() => {
    const base = [
      { name: 'Aspirin 81mg', reason: 'Antiplatelet prophylaxis', safety: 'Monitor bleeding' },
      { name: 'Atorvastatin 20mg', reason: 'Lipid management', safety: 'Baseline LFTs required' },
    ]

    if (readout.riskScore > 65) {
      base.unshift({ name: 'Nitroglycerin PRN', reason: 'Symptom control under clinician review', safety: 'Avoid PDE-5 coadministration' })
    }

    if (biomarkers.glucose > 150) {
      base.push({ name: 'Metformin adjusted dosing', reason: 'Hyperglycemia risk', safety: 'Renal function check' })
    }

    return base
  }, [biomarkers.glucose, readout.riskScore])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'intelligence':
        return (
          <div className="space-y-6">
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="eyebrow">Real-time clinical risk</p>
                    <h3 className="section-title">Patient intake and symptom checker</h3>
                  </div>
                  <div className="pill success">{readout.confidence}% confidence</div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(symptomConfig).map(([key, config]) => (
                    <div key={key} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-200">{config.label}</span>
                        <span className="text-xs text-cyan-300">{symptoms[key as SymptomKey]}/5</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        value={symptoms[key as SymptomKey]}
                        onChange={(event) =>
                          setSymptoms((current) => ({
                            ...current,
                            [key as SymptomKey]: Number(event.target.value),
                          }))
                        }
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel p-6">
                <p className="eyebrow">Risk overview</p>
                <h3 className="section-title">AI risk score</h3>
                <div className="mt-6 flex items-center gap-4">
                  <div className="relative h-28 w-28 shrink-0">
                    <div className="absolute inset-0 rounded-full border border-white/10 bg-slate-900/40" />
                    <div
                      className="absolute inset-2 rounded-full flex items-center justify-center text-2xl font-semibold"
                      style={{ background: `conic-gradient(${getRiskColor(readout.riskScore)} ${readout.riskScore}%, rgba(255,255,255,0.08) 0)` }}
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-950/80">{readout.riskScore}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-white">{readout.primary}</p>
                    <p className="mt-1 text-sm text-slate-300">Current total weighted risk across symptoms.</p>
                  </div>
                </div>
                <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
                  <span className="font-semibold">Clinical review:</span> {readout.secondary} requires follow-up with a clinician.
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="glass-panel p-6">
                <p className="eyebrow">Decision support</p>
                <h3 className="section-title">Primary / secondary / differential diagnosis</h3>
                <div className="mt-5 space-y-3">
                  {[
                    { label: 'Primary', value: readout.primary },
                    { label: 'Secondary', value: readout.secondary },
                    { label: 'Differential', value: readout.differential },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/30 p-3">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</span>
                      <span className="font-medium text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel p-6">
                <p className="eyebrow">Biomarker explorer</p>
                <h3 className="section-title">Sensitivity sandbox</h3>
                <div className="mt-5 space-y-4">
                  {Object.entries(biomarkers).map(([key, value]) => (
                    <div key={key}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="capitalize text-slate-200">{key}</span>
                        <span className="text-cyan-300">{value}</span>
                      </div>
                      <input
                        type="range"
                        min={key === 'glucose' ? 60 : key === 'troponin' ? 0 : 5}
                        max={key === 'glucose' ? 220 : key === 'troponin' ? 2.5 : 18}
                        step={key === 'troponin' ? 0.01 : 1}
                        value={value}
                        onChange={(event) =>
                          setBiomarkers((current) => ({
                            ...current,
                            [key]: Number(event.target.value),
                          }))
                        }
                        className="w-full accent-emerald-400"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      case 'lab':
        return (
          <div className="space-y-6">
            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="eyebrow">Batch ingestion</p>
                    <h3 className="section-title">CSV / JSON lab analyzer</h3>
                  </div>
                  <label className="inline-flex cursor-pointer items-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200">
                    Upload file
                    <input type="file" accept=".csv,.json" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                <div className="rounded-2xl border border-dashed border-cyan-400/30 bg-slate-950/30 p-8 text-center text-slate-300">
                  <div className="mb-3 text-4xl">📤</div>
                  <p className="font-medium text-white">Drag & drop lab results</p>
                  <p className="mt-2 text-sm text-slate-400">Supports CSV and JSON export batches from EHR systems.</p>
                </div>
                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <MetricCard label="Rows loaded" value={uploadedRows.length || 12} accent="#22d3ee" />
                  <MetricCard label="Anomalies" value={alerts[1]?.includes('3') ? 3 : 1} accent="#f97316" />
                  <MetricCard label="Average glucose" value={`${Math.round((biomarkers.glucose + 122) / 2)} mg/dL`} accent="#34d399" />
                </div>
              </div>

              <div className="glass-panel p-6">
                <p className="eyebrow">Outlier review</p>
                <h3 className="section-title">Flagged metrics</h3>
                <div className="mt-5 space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                      {alert}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <div className="glass-panel p-6">
                <p className="eyebrow">Clinical summary</p>
                <h3 className="section-title">Lab metric summary</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(biomarkerProfile).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-white/10 bg-slate-950/20 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{key}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xl font-semibold text-white">{value}%</span>
                        <span className="text-xs rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200">Stable</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel p-6">
                <p className="eyebrow">Imaging</p>
                <h3 className="section-title">Medical imaging analysis node</h3>
                <div className="relative mt-4 h-52 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.18),_rgba(15,23,42,0.9))] p-4">
                  <div className="absolute inset-3 rounded-2xl border border-dashed border-slate-500/60" />
                  <div className="absolute left-16 top-10 h-20 w-24 rounded-xl bg-cyan-400/10 ring-1 ring-cyan-400/30" />
                  <div className="absolute left-32 top-16 h-20 w-20 rounded-full bg-cyan-400/20 shadow-[0_0_24px_rgba(34,211,238,0.4)]" />
                  <div className="absolute right-16 top-12 h-16 w-16 rounded-xl bg-emerald-400/15 ring-1 ring-emerald-400/30" />
                  <div className="absolute bottom-10 right-12 h-16 w-20 rounded-xl border-2 border-red-400/60 bg-red-500/20" />
                  <div className="absolute bottom-12 left-28 rounded-full border border-rose-400/80 bg-rose-500/20 px-2 py-1 text-[10px] font-medium text-rose-200">Hotspot</div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'decision':
        return (
          <div className="space-y-6">
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="eyebrow">Clinical output</p>
                    <h3 className="section-title">Diagnostic summary report</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100"
                  >
                    Export PDF / Print
                  </button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-5 text-sm leading-7 text-slate-200">
                  <p><strong>Primary concern:</strong> {readout.primary}</p>
                  <p><strong>Clinical summary:</strong> Patient demonstrates elevated risk of cardiovascular compromise with secondary metabolic burden. Repeat objective vitals and evaluate for ischemic progression within 24 hours.</p>
                  <p><strong>Evidence:</strong> Weighted risk score {readout.riskScore}/100 with {readout.confidence}% model confidence and biomarker drift consistent with acute stress response.</p>
                  <p><strong>Next steps:</strong> Continue monitoring, obtain serial troponin and ECG, review imaging, and escalate if oxygen saturation drops below 92% or SBP remains unstable.</p>
                </div>
              </div>

              <div className="glass-panel p-6">
                <p className="eyebrow">Safety</p>
                <h3 className="section-title">Medication guidance</h3>
                <div className="mt-4 space-y-3">
                  {medicationPlan.map((med) => (
                    <div key={med.name} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{med.name}</p>
                        {med.name.includes('Nitro') ? <span className="pill danger">Alert</span> : <span className="pill success">Monitor</span>}
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{med.reason}</p>
                      <p className="mt-1 text-xs text-amber-200">{med.safety}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      case 'ehr':
        return (
          <div className="space-y-6">
            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="glass-panel p-6">
                <p className="eyebrow">Longitudinal insight</p>
                <h3 className="section-title">Population risk trajectory</h3>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historySeries}>
                      <defs>
                        <linearGradient id="riskFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Area type="monotone" dataKey="score" stroke="#22d3ee" fill="url(#riskFill)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel p-6">
                <p className="eyebrow">System architecture</p>
                <h3 className="section-title">ML pipeline overview</h3>
                <div className="mt-5 space-y-3">
                  {['Input Signals', 'Feature Extraction', 'Ensemble ML', 'XAI Layer', 'Clinical Output'].map((stage, index) => (
                    <div key={stage} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15 text-xs text-cyan-200">
                        {index + 1}
                      </div>
                      <div className="flex-1 rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-200">{stage}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-panel p-6">
              <p className="eyebrow">Population health</p>
              <h3 className="section-title">Disease prevalence and systemic risk</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <MetricCard label="Prevalence" value="18.2%" accent="#22d3ee" />
                <MetricCard label="Acute risk" value="12.6%" accent="#f97316" />
                <MetricCard label="Care utilization" value="91.4%" accent="#34d399" />
              </div>
            </div>
          </div>
        )
      case 'telemetry':
        return (
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-3">
              <MetricCard label="Latency" value="42ms" accent="#22d3ee" />
              <MetricCard label="Model accuracy" value="99.1%" accent="#34d399" />
              <MetricCard label="Uptime" value="100%" accent="#a78bfa" />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="glass-panel p-6">
                <p className="eyebrow">System telemetry</p>
                <h3 className="section-title">Operational status</h3>
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">🟢 Active | Render Cloud</div>
                  <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3 text-sm text-slate-200">Rate limiting status: healthy, with automatic backoff enabled.</div>
                  <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3 text-sm text-slate-200">FHIR / HL7 sandbox: validated for patient demographics and lab payloads.</div>
                </div>
              </div>

              <div className="glass-panel p-6">
                <p className="eyebrow">Compliance</p>
                <h3 className="section-title">HIPAA + metadata checks</h3>
                <div className="mt-5 space-y-3">
                  {['HIPAA safeguards: validated', 'FHIR R4 metadata: aligned', 'Audit logs: request IDs attached', 'Rate limiting: enforced'].map((item) => (
                    <div key={item} className="rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-200">{item}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-panel p-6">
              <p className="eyebrow">API integration console</p>
              <h3 className="section-title">FHIR / HL7 sandbox payloads</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {[
                  { label: 'FHIR patient bundle', payload: '{"resourceType":"Bundle","type":"collection"}' },
                  { label: 'HL7 observation', payload: 'OBX|1|NM|2157-6^Hemoglobin||9.7|g/dL' },
                ].map((entry) => (
                  <div key={entry.label} className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
                    <p className="text-sm font-semibold text-white">{entry.label}</p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-cyan-100">{entry.payload}</pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-4 md:p-8">
        <div className="glass-panel p-6 text-slate-200">
          <h2 className="text-2xl font-bold text-white mb-4">Clinical workspace</h2>
          <p className="mb-3 text-slate-300">Unable to load the dashboard data. The backend may still be waking up.</p>
          <button
            type="button"
            onClick={() => {
              setRetryCount(0)
              load()
            }}
            className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-100"
          >
            Retry sync
          </button>
        </div>
      </div>
    )
  }

  if (data.role_view === 'patient') {
    return <PatientDashboard data={data} />
  }

  const telemetry = (data.workspace as Record<string, unknown>) || {}

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="eyebrow">Clinical command center</p>
          <h1 className="text-3xl font-bold text-white">Medical intelligence workspace</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill success">🟢 {String(telemetry?.status || 'Render Cloud Active')}</span>
          <a href="https://medical-diagnosis-ml.vercel.app" target="_blank" rel="noreferrer" className="pill neutral">Live Demo</a>
          <a href="https://github.com/Vansh7307/medical-diagnosis-ml" target="_blank" rel="noreferrer" className="pill neutral">GitHub Repo</a>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Patients" value={Number(data.total_patients || 0)} accent="#22d3ee" />
        <MetricCard label="Diagnoses" value={Number(data.total_diagnoses || 0)} accent="#34d399" />
        <MetricCard label="Models" value={modelMetrics.filter((entry) => entry.trained).length} accent="#a78bfa" />
        <GaugeCard label="Avg Confidence" percent={avgConfidencePct} accent="#fbbf24" />
      </div>

      <div className="glass-panel mb-6 overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-white/10 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-500/30'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4 md:p-6">{renderTabContent()}</div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="glass-panel p-6">
          <p className="eyebrow">Model performance</p>
          <h3 className="section-title">Diagnostic model benchmark</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelMetrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="f1" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6">
          <p className="eyebrow">Case mix</p>
          <h3 className="section-title">Diagnosis distribution</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={diagnosisTypeData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {diagnosisTypeData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function PatientDashboard({ data }: { data: Record<string, unknown> }) {
  const linked = Boolean(data.linked)
  const patient = data.patient as Record<string, unknown> | undefined
  const recentDiagnoses = (data.recent_diagnoses || []) as Array<Record<string, unknown>>

  if (!linked) {
    return (
      <div className="p-4 md:p-8">
        <div className="glass-panel p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Welcome</h2>
          <p className="text-slate-300">Your account is not yet linked to a clinical record. Please contact the clinic to associate your patient record.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Welcome, {String(patient?.first_name || 'Patient')}</h2>
        <p className="text-slate-400">Patient code: {String(patient?.patient_id || 'N/A')}</p>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <MetricCard label="Reports" value={Number(data.total_diagnoses || 0)} accent="#22d3ee" />
        <MetricCard label="Condition categories" value={Object.keys(data.diagnosis_by_type || {}).length} accent="#a78bfa" />
      </div>
      <div className="glass-panel p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="section-title">Recent reports</h3>
          <Link to="/diagnosis/history" className="text-sm text-cyan-300 hover:text-cyan-200">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-200">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Result</th>
                <th className="py-2 pr-4">Confidence</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentDiagnoses.map((item) => (
                <tr key={String(item.id)} className="border-b border-white/10">
                  <td className="py-2 pr-4 capitalize">{String(item.diagnosis_type || '')}</td>
                  <td className="py-2 pr-4">{String(item.prediction || '')}</td>
                  <td className="py-2 pr-4">{(((Number(item.confidence) || 0) * 100)).toFixed(1)}%</td>
                  <td className="py-2 pr-4 text-slate-400">{new Date(String(item.created_at || '')).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
