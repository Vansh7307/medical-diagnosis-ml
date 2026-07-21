import { useState } from 'react'
import { diagnosisAPI } from '../services/api'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
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
  const [selectedType, setSelectedType] = useState<DiagnosisType>('heart')
  const [patientId, setPatientId] = useState('')
  const [features, setFeatures] = useState<Record<string, number>>({})
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Prediction failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Initialize defaults on mount
  useState(() => {
    const defaults: Record<string, number> = {}
    FORM_FIELDS.heart.forEach(f => { defaults[f.name] = f.default })
    setFeatures(defaults)
  })

  const fields = FORM_FIELDS[selectedType]
  const riskScore = result ? (result.risk_score as number) : 0
  const riskColor = riskScore > 70 ? '#ef4444' : riskScore > 40 ? '#f59e0b' : '#10b981'

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">New Diagnosis</h2>

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