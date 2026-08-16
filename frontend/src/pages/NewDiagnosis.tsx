import { useEffect, useRef, useState } from 'react'
import { diagnosisAPI } from '../services/api'
import { RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ReferenceLine } from 'recharts'
import { MiniGauge } from '../components/MetricCard'

type DiagnosisType = 'heart' | 'diabetes' | 'cancer'

const FORM_FIELDS: Record<DiagnosisType, { name: string; label: string; default: number; min: number; max: number; step: number }[]> = {
  heart: [
    { name: 'age', label: 'Age', default: 55, min: 20, max: 100, step: 1 },
    { name: 'sex', label: 'Sex (1=M, 0=F)', default: 1, min: 0, max: 1, step: 1 },
    { name: 'cp', label: 'Chest Pain Type (0-3)', default: 1, min: 0, max: 3, step: 1 },
    { name: 'trestbps', label: 'Resting BP (mmHg)', default: 130, min: 80, max: 200, step: 1 },
    { name: 'chol', label: 'Cholesterol (mg/dl)', default: 240, min: 100, max: 600, step: 1 },
    { name: 'fbs', label: 'Fasting BS > 120 (0/1)', default: 0, min: 0, max: 1, step: 1 },
    { name: 'restecg', label: 'Resting ECG (0-2)', default: 0, min: 0, max: 2, step: 1 },
    { name: 'thalach', label: 'Max Heart Rate', default: 150, min: 60, max: 210, step: 1 },
    { name: 'exang', label: 'Exercise Angina (0/1)', default: 0, min: 0, max: 1, step: 1 },
    { name: 'oldpeak', label: 'ST Depression', default: 1.0, min: 0, max: 6, step: 0.1 },
    { name: 'slope', label: 'ST Slope (0-2)', default: 1, min: 0, max: 2, step: 1 },
    { name: 'ca', label: 'Vessels Colored (0-3)', default: 0, min: 0, max: 3, step: 1 },
    { name: 'thal', label: 'Thallium Test (0-3)', default: 2, min: 0, max: 3, step: 1 },
  ],
  diabetes: [
    { name: 'Pregnancies', label: 'Pregnancies', default: 2, min: 0, max: 17, step: 1 },
    { name: 'Glucose', label: 'Glucose (mg/dl)', default: 120, min: 40, max: 200, step: 1 },
    { name: 'BloodPressure', label: 'Blood Pressure', default: 72, min: 30, max: 120, step: 1 },
    { name: 'SkinThickness', label: 'Skin Thickness', default: 29, min: 0, max: 99, step: 1 },
    { name: 'Insulin', label: 'Insulin (mu U/ml)', default: 100, min: 0, max: 900, step: 1 },
    { name: 'BMI', label: 'BMI', default: 32, min: 15, max: 67, step: 0.1 },
    { name: 'DiabetesPedigreeFunction', label: 'Diabetes Pedigree', default: 0.5, min: 0.05, max: 2.5, step: 0.01 },
    { name: 'Age', label: 'Age', default: 40, min: 18, max: 100, step: 1 },
  ],
  cancer: [
    { name: 'mean radius', label: 'Mean Radius', default: 14, min: 6, max: 30, step: 0.1 },
    { name: 'mean texture', label: 'Mean Texture', default: 19, min: 8, max: 40, step: 0.1 },
    { name: 'mean perimeter', label: 'Mean Perimeter', default: 92, min: 40, max: 200, step: 0.1 },
    { name: 'mean area', label: 'Mean Area', default: 655, min: 140, max: 2000, step: 1 },
    { name: 'mean smoothness', label: 'Mean Smoothness', default: 0.1, min: 0.05, max: 0.2, step: 0.001 },
    { name: 'mean compactness', label: 'Mean Compactness', default: 0.1, min: 0.01, max: 0.4, step: 0.001 },
    { name: 'mean concavity', label: 'Mean Concavity', default: 0.09, min: 0, max: 0.5, step: 0.001 },
    { name: 'mean concave points', label: 'Mean Concave Points', default: 0.05, min: 0, max: 0.25, step: 0.001 },
    { name: 'mean symmetry', label: 'Mean Symmetry', default: 0.18, min: 0.1, max: 0.35, step: 0.001 },
    { name: 'mean fractal dimension', label: 'Mean Fractal Dim', default: 0.06, min: 0.04, max: 0.1, step: 0.001 },
    { name: 'radius error', label: 'Radius Error', default: 0.4, min: 0.1, max: 3, step: 0.01 },
    { name: 'texture error', label: 'Texture Error', default: 1.2, min: 0.3, max: 5, step: 0.01 },
    { name: 'perimeter error', label: 'Perimeter Error', default: 2.8, min: 0.5, max: 20, step: 0.01 },
    { name: 'area error', label: 'Area Error', default: 40, min: 6, max: 400, step: 0.1 },
    { name: 'smoothness error', label: 'Smoothness Error', default: 0.007, min: 0.001, max: 0.02, step: 0.001 },
    { name: 'compactness error', label: 'Compactness Error', default: 0.025, min: 0.002, max: 0.1, step: 0.001 },
    { name: 'concavity error', label: 'Concavity Error', default: 0.03, min: 0, max: 0.15, step: 0.001 },
    { name: 'concave points error', label: 'Concave Points Error', default: 0.012, min: 0, max: 0.05, step: 0.001 },
    { name: 'symmetry error', label: 'Symmetry Error', default: 0.02, min: 0.008, max: 0.08, step: 0.001 },
    { name: 'fractal dimension error', label: 'Fractal Dim Error', default: 0.004, min: 0.001, max: 0.02, step: 0.001 },
    { name: 'worst radius', label: 'Worst Radius', default: 16, min: 7, max: 36, step: 0.1 },
    { name: 'worst texture', label: 'Worst Texture', default: 22, min: 10, max: 50, step: 0.1 },
    { name: 'worst perimeter', label: 'Worst Perimeter', default: 105, min: 45, max: 250, step: 0.1 },
    { name: 'worst area', label: 'Worst Area', default: 800, min: 180, max: 3000, step: 1 },
    { name: 'worst smoothness', label: 'Worst Smoothness', default: 0.13, min: 0.07, max: 0.25, step: 0.001 },
    { name: 'worst compactness', label: 'Worst Compactness', default: 0.2, min: 0.02, max: 1, step: 0.001 },
    { name: 'worst concavity', label: 'Worst Concavity', default: 0.2, min: 0, max: 1.5, step: 0.001 },
    { name: 'worst concave points', label: 'Worst Concave Points', default: 0.1, min: 0, max: 0.4, step: 0.001 },
    { name: 'worst symmetry', label: 'Worst Symmetry', default: 0.25, min: 0.1, max: 0.7, step: 0.001 },
    { name: 'worst fractal dimension', label: 'Worst Fractal Dim', default: 0.07, min: 0.05, max: 0.15, step: 0.001 },
  ],
}

export default function NewDiagnosis() {
  let currentUser: { role?: string } = {}
  try {
    currentUser = JSON.parse(sessionStorage.getItem('user') || '{}')
  } catch {
    // ignore -- Layout/App already guard against corrupted values globally
  }

  if (currentUser.role === 'patient') {
    return (
      <div className="p-4 md:p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">New Diagnosis</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-900 max-w-md">
          Running new diagnoses is handled by clinic staff. You can view your existing reports and
          history under <span className="font-medium">My History</span> in the sidebar.
        </div>
      </div>
    )
  }

  return <StaffDiagnosisForm />
}

/** All the original form logic lives here so hooks are called unconditionally
 * on every render -- this component only ever mounts for non-patient roles,
 * since the wrapper above returns early before rendering it otherwise. */
function StaffDiagnosisForm() {
  const [selectedType, setSelectedType] = useState<DiagnosisType>('heart')
  const [patientId, setPatientId] = useState('')
  const [features, setFeatures] = useState<Record<string, number>>({})
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [explanation, setExplanation] = useState<Record<string, unknown> | null>(null)
  const [explaining, setExplaining] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTypeChange = (type: DiagnosisType) => {
    setSelectedType(type)
    setResult(null)
    // Set defaults
    const defaults: Record<string, number> = {}
    FORM_FIELDS[type].forEach(f => { defaults[f.name] = f.default })
    setFeatures(defaults)
  }

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    setExplanation(null)

    try {
      const pid = patientId.trim() ? patientId.trim() : undefined
      let res
      if (selectedType === 'heart') {
        res = await diagnosisAPI.heart(features, pid)
      } else if (selectedType === 'diabetes') {
        res = await diagnosisAPI.diabetes(features, pid)
      } else {
        res = await diagnosisAPI.cancer(features, pid)
      }
      setResult(res.data.result)

      // Fetch a real explanation for why the model predicted this -- non-fatal
      // if it fails, the diagnosis result itself is still fully valid either way.
      setExplaining(true)
      try {
        const explainRes = await diagnosisAPI.explain(selectedType, features)
        setExplanation(explainRes.data.explanation)
      } catch {
        setExplanation(null)
      } finally {
        setExplaining(false)
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Prediction failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Initialize defaults once on mount. This must be an effect: calling a
  // setter from a useState initializer causes an avoidable render update.
  useEffect(() => {
    const defaults: Record<string, number> = {}
    FORM_FIELDS.heart.forEach(f => { defaults[f.name] = f.default })
    setFeatures(defaults)
  }, [])

  const fields = FORM_FIELDS[selectedType]
  const riskScore = result ? (result.risk_score as number) : 0
  const riskColor = riskScore > 70 ? '#ef4444' : riskScore > 40 ? '#f59e0b' : '#10b981'

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">New Diagnosis</h2>

      <LabResultsPanel />
      <ClinicalNotesPanel />
      <LesionImagePanel />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            {/* Type selector */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(['heart', 'diabetes', 'cancer'] as DiagnosisType[]).map(type => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedType === type ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {type === 'heart' ? 'Heart Disease' : type === 'diabetes' ? 'Diabetes' : 'Breast Cancer'}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Patient Code (optional)</label>
              <input
                type="text"
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                placeholder="e.g. PAT-AFD9477D — leave empty for anonymous prediction"
                className="w-full md:w-64 px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <form onSubmit={handlePredict}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 max-h-[500px] overflow-y-auto pr-2">
                {fields.map(field => (
                  <div key={field.name}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                    <input
                      type="number"
                      step={field.step}
                      min={field.min}
                      max={field.max}
                      value={features[field.name] ?? field.default}
                      onChange={e => setFeatures({ ...features, [field.name]: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border rounded text-sm"
                    />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                {loading ? 'Analyzing...' : 'Run Diagnosis'}
              </button>
            </form>
          </div>
        </div>

        {/* Results */}
        <div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4">{error}</div>
          )}

          {result && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Diagnosis Result</h3>

              {/* Risk Gauge */}
              <div className="text-center mb-4">
                <ResponsiveContainer width="100%" height={180}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ value: riskScore, fill: riskColor }]} startAngle={180} endAngle={0}>
                    <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#f1f5f9' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <p className="text-3xl font-bold" style={{ color: riskColor }}>{riskScore.toFixed(1)}%</p>
                <p className="text-sm text-slate-500">Risk Score</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <MiniGauge label="Confidence" percent={(result.confidence as number) * 100} accent="#1D9E75" />
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-col justify-center">
                  <p className="text-[11px] text-slate-500">Prediction</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{result.prediction_label as string}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Model Version</span>
                  <span className="font-mono text-xs">{result.model_version as string}</span>
                </div>
              </div>
            </div>
          )}

          {(explanation || explaining) && (
            <div className="bg-white rounded-xl shadow-sm border p-6 mt-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-slate-900">Why this result?</h3>
                <span className="text-[10px] font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">SHAP · XAI</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Each clinical feature's real contribution to this specific prediction, computed via SHAP
                (SHapley Additive exPlanations) -- not a generic importance ranking, but the exact effect
                for this patient's values.
              </p>

              {explaining ? (
                <div className="text-sm text-slate-500 py-4 text-center">Computing explanation…</div>
              ) : explanation?.available === false ? (
                <div className="text-sm text-slate-500 py-2">{explanation.message as string}</div>
              ) : (
                <ExplanationChart explanation={explanation as Record<string, unknown>} />
              )}
            </div>
          )}

          {!result && !error && (
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
              Select a diagnosis type, fill in the features, and click "Run Diagnosis" to see results.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Renders real SHAP feature-contribution values as a signed horizontal bar
 * chart -- red bars pushed the prediction toward higher risk, blue bars
 * pushed it toward lower risk, for THIS specific patient's values. */
function ExplanationChart({ explanation }: { explanation: Record<string, unknown> }) {
  const topFeatures = (explanation.top_features || explanation.feature_importance || []) as Array<{
    feature: string; importance: number
  }>

  if (!topFeatures.length) {
    return <p className="text-sm text-slate-500">No explanation data available.</p>
  }

  const chartData = [...topFeatures].reverse().map(f => ({
    name: f.feature,
    value: f.importance,
  }))

  const baseValue = explanation.base_value as number | undefined
  const predictionProbability = explanation.prediction_probability as number | undefined

  return (
    <div>
      {typeof baseValue === 'number' && typeof predictionProbability === 'number' && (
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div>
            <span className="text-slate-400">Baseline risk (average patient): </span>
            <span className="font-mono font-medium">{(baseValue * 100).toFixed(1)}%</span>
          </div>
          <span className="text-slate-300">→</span>
          <div>
            <span className="text-slate-400">This patient: </span>
            <span className="font-mono font-medium">{(predictionProbability * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 32)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
          <ReferenceLine x={0} stroke="#94a3b8" />
          <Tooltip
            formatter={(value: number) => [value.toFixed(4), 'SHAP contribution']}
            labelStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="value" radius={3}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.value >= 0 ? '#ef4444' : '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Increases risk</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Decreases risk</span>
      </div>
    </div>
  )
}

function LabResultsPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const selectFile = (candidate?: File) => {
    if (!candidate) return
    if (!candidate.name.toLowerCase().endsWith('.csv')) {
      setError('Upload a CSV file with one header row and one result row.')
      return
    }
    setFile(candidate)
    setResult(null)
    setError('')
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const response = await diagnosisAPI.analyzeLabs(file)
      setResult(response.data)
    } catch (err) {
      const response = err as { response?: { data?: { error?: string } } }
      setError(response.response?.data?.error || 'Unable to analyze this lab file right now.')
    } finally {
      setLoading(false)
    }
  }

  const inference = result?.result as Record<string, unknown> | undefined

  return (
    <section className="bg-white rounded-xl shadow-sm border p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">Lab Results Console</h3>
            <span className="text-[10px] font-medium bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full border border-cyan-200">CSV · LIVE INFERENCE</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Drop one structured result row; headers are matched to a validated heart, diabetes, or cancer model.</p>
        </div>
        <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">Validated before scoring</span>
      </div>

      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => selectFile(event.target.files?.[0])} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files[0]) }}
        className={`w-full border border-dashed rounded-xl px-4 py-5 text-center transition-all ${dragging ? 'border-cyan-400 bg-cyan-50' : 'border-slate-300 hover:border-cyan-400 hover:bg-slate-50'}`}
      >
        <span className="block text-sm font-medium text-slate-700">{file ? file.name : 'Drop CSV lab results here, or browse'}</span>
        <span className="block text-xs text-slate-500 mt-1">UTF-8 · one row · 512 KB max</span>
      </button>

      <div className="flex items-center gap-3 mt-3">
        <button type="button" onClick={analyze} disabled={!file || loading} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50">
          {loading ? 'Analyzing labs…' : 'Run Lab Analysis'}
        </button>
        {file && <button type="button" onClick={() => { setFile(null); setResult(null); setError(''); if (inputRef.current) inputRef.current.value = '' }} className="text-sm text-slate-500 hover:text-slate-800">Clear</button>}
      </div>

      {error && <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {inference && (
        <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Model</p><p className="font-semibold capitalize text-slate-900">{result?.diagnosis_type as string}</p></div>
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Diagnostic confidence</p><p className="font-semibold text-slate-900">{((inference.confidence as number) * 100).toFixed(1)}%</p></div>
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Clinical result</p><p className="font-semibold text-slate-900">{inference.prediction_label as string}</p></div>
        </div>
      )}
    </section>
  )
}

/** Free-text clinical notes urgency classifier -- a real, working NLP
 * modality (TF-IDF + Logistic Regression) alongside the structured
 * tabular diagnosis models above. Independent input, not required to
 * run a structured diagnosis. */
function ClinicalNotesPanel() {
  const [notes, setNotes] = useState('')
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  const handleAnalyze = async () => {
    if (!notes.trim()) return
    setLoading(true)
    setError('')
    setAnalysis(null)
    try {
      const res = await diagnosisAPI.analyzeNotes(notes.trim())
      setAnalysis(res.data.analysis)
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error || 'Unable to analyze notes right now.')
    } finally {
      setLoading(false)
    }
  }

  const urgencyStyle: Record<string, string> = {
    routine: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    urgent: 'bg-amber-50 text-amber-700 border-amber-200',
    emergency: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900">Clinical Notes Analyzer</h3>
          <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">NLP</span>
        </div>
        <span className="text-slate-400 text-sm">{expanded ? '▲ Hide' : '▼ Analyze free-text notes'}</span>
      </button>

      {expanded && (
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-3">
            Paste a patient's chief complaint or symptom description in plain text. A trained NLP model
            classifies the urgency tier (routine / urgent / emergency) and shows which words drove that call.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Patient reports severe chest pain radiating to the left arm, sweating and nausea..."
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-400">{notes.length}/2000</span>
            <button
              onClick={handleAnalyze}
              disabled={loading || !notes.trim()}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing…' : 'Analyze Notes'}
            </button>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {analysis && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border capitalize ${urgencyStyle[analysis.urgency as string] || ''}`}>
                  {analysis.urgency as string}
                </span>
                <span className="text-sm text-slate-500">
                  {((analysis.confidence as number) * 100).toFixed(1)}% confidence
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {Object.entries(analysis.probabilities as Record<string, number>).map(([tier, prob]) => (
                  <div key={tier} className="bg-slate-50 rounded-lg p-2 text-center border border-slate-200">
                    <p className="text-[10px] text-slate-500 capitalize">{tier}</p>
                    <p className="text-sm font-semibold text-slate-900">{(prob * 100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>

              {((analysis.top_terms as Array<{ term: string; contribution: number }>) || []).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">Words that drove this classification:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(analysis.top_terms as Array<{ term: string; contribution: number }>).map((t, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded-full border ${
                          t.contribution >= 0
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {t.term}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Lesion image classifier -- a real, working computer vision modality
 * (classical HOG/GLCM feature extraction + Random Forest, deliberately
 * not a deep learning CNN -- see backend/app/ml/lesion_analyzer.py for
 * why). Independent input, alongside the clinical notes and structured
 * tabular diagnosis models above. */
function LesionImagePanel() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setAnalysis(null)
    setError('')
    setPreviewUrl(URL.createObjectURL(selected))
  }

  const handleAnalyze = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setAnalysis(null)
    try {
      const res = await diagnosisAPI.analyzeImage(file)
      setAnalysis(res.data.analysis)
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error || 'Unable to analyze this image right now.')
    } finally {
      setLoading(false)
    }
  }

  const resultStyle: Record<string, string> = {
    benign: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    malignant: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900">Lesion Image Analyzer</h3>
          <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Computer Vision</span>
        </div>
        <span className="text-slate-400 text-sm">{expanded ? '▲ Hide' : '▼ Upload an image'}</span>
      </button>

      {expanded && (
        <div className="mt-4">
          <p className="text-xs text-slate-500 mb-3">
            Upload a skin lesion photo. A classical computer vision model (shape, color, and texture
            feature extraction -- not a deep neural network) classifies it as benign or malignant-style.
            Trained on synthetic images, for demonstration purposes only.
          </p>

          <div className="flex items-start gap-4">
            <div className="flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/bmp"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading || !file}
                className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Analyzing…' : 'Analyze Image'}
              </button>
            </div>
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
            )}
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {analysis && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border capitalize ${resultStyle[analysis.classification as string] || ''}`}>
                  {analysis.classification as string}
                </span>
                <span className="text-sm text-slate-500">
                  {((analysis.confidence as number) * 100).toFixed(1)}% confidence
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(analysis.probabilities as Record<string, number>).map(([label, prob]) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-2 text-center border border-slate-200">
                    <p className="text-[10px] text-slate-500 capitalize">{label}</p>
                    <p className="text-sm font-semibold text-slate-900">{(prob * 100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
