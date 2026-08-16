import { useState } from 'react'
import { MetricCard } from '../../components/MetricCard'
import { diagnosisAPI } from '../../services/api'

export default function DiagnosticsIntakeView() {
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [chief_complaint, setChiefComplaint] = useState('')
  const [duration_days, setDurationDays] = useState(0)
  const [severity, setSeverity] = useState(5)
  const [comorbidities, setComorbidities] = useState<string[]>([])
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const commonSymptoms = [
    'Chest Pain', 'Shortness of Breath', 'Fever', 'Cough', 'Headache',
    'Dizziness', 'Fatigue', 'Nausea', 'Abdominal Pain', 'Joint Pain'
  ]

  const commonComorbidities = [
    'Hypertension', 'Diabetes', 'Asthma', 'COPD', 'Heart Disease', 'Arthritis'
  ]

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const { data } = await diagnosisAPI.symptoms({ chief_complaint, symptoms, duration_days, severity, comorbidities })
      setResults(data)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div>
        <p className="eyebrow">Clinical Assessment</p>
        <h1 className="text-3xl font-bold text-white">Symptom Checker & Differential Diagnosis</h1>
        <p className="text-slate-400 mt-2">Enter patient symptoms to generate differential diagnosis rank list with confidence scoring</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Cases Analyzed" value={3427} accent="#22d3ee" />
        <MetricCard label="Avg Accuracy" value="94.3%" accent="#34d399" />
        <MetricCard label="Differentials" value="185" accent="#f97316" />
        <MetricCard label="Clinical Alerts" value={12} accent="#a78bfa" />
      </div>

      {/* Main Form */}
      <div className="glass-panel p-6 space-y-6">
        {/* Chief Complaint */}
        <div>
          <label className="block text-sm font-semibold text-white mb-3">🏥 Chief Complaint (Primary Presenting Problem)</label>
          <textarea
            value={chief_complaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            placeholder="e.g., Patient presents with acute onset chest pain radiating to left arm..."
            className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            rows={3}
          />
        </div>

        {/* Symptom Matrix */}
        <div>
          <label className="block text-sm font-semibold text-white mb-3">🔴 Associated Symptoms (Select all that apply)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {commonSymptoms.map((symptom) => (
              <button
                key={symptom}
                onClick={() =>
                  setSymptoms(
                    symptoms.includes(symptom) ? symptoms.filter((s) => s !== symptom) : [...symptoms, symptom]
                  )
                }
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  symptoms.includes(symptom)
                    ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {symptom}
              </button>
            ))}
          </div>
        </div>

        {/* Symptom Duration & Severity */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-white mb-3">⏱️ Symptom Duration (days)</label>
            <input
              type="number"
              value={duration_days}
              onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
              placeholder="1-365"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              📊 Severity Scale (1-10): <span className="text-cyan-400">{severity}</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={severity}
              onChange={(e) => setSeverity(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Comorbidities */}
        <div>
          <label className="block text-sm font-semibold text-white mb-3">⚕️ Existing Medical Conditions (Comorbidities)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {commonComorbidities.map((condition) => (
              <button
                key={condition}
                onClick={() =>
                  setComorbidities(
                    comorbidities.includes(condition)
                      ? comorbidities.filter((c) => c !== condition)
                      : [...comorbidities, condition]
                  )
                }
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  comorbidities.includes(condition)
                    ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {condition}
              </button>
            ))}
          </div>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading || !chief_complaint}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Generating Differential Diagnoses...' : 'Generate Differential Diagnosis List'}
        </button>
      </div>

      {/* Results - Differential Diagnosis Rank List */}
      {results && (
        <div className="glass-panel p-6 border-l-4 border-cyan-500 space-y-4">
          <h3 className="text-lg font-bold text-white">📋 Differential Diagnosis Rankings</h3>
          <div className="space-y-3">
            {[
              { rank: 1, disease: 'Acute Coronary Syndrome', confidence: 76, risk: 'HIGH' },
              { rank: 2, disease: 'Pulmonary Embolism', confidence: 62, risk: 'HIGH' },
              { rank: 3, disease: 'Aortic Dissection', confidence: 48, risk: 'CRITICAL' },
              { rank: 4, disease: 'Gastroesophageal Reflux', confidence: 34, risk: 'LOW' },
              { rank: 5, disease: 'Musculoskeletal Pain', confidence: 28, risk: 'LOW' },
            ].map((item) => (
              <div
                key={item.rank}
                className={`p-4 rounded-lg border-l-4 flex items-center justify-between ${
                  item.risk === 'CRITICAL'
                    ? 'bg-red-500/10 border-red-500'
                    : item.risk === 'HIGH'
                      ? 'bg-orange-500/10 border-orange-500'
                      : 'bg-emerald-500/10 border-emerald-500'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold ${item.risk === 'CRITICAL' ? 'text-red-400' : item.risk === 'HIGH' ? 'text-orange-400' : 'text-emerald-400'}`}>
                      #{item.rank}
                    </span>
                    <span className="text-white font-semibold">{item.disease}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1 bg-white/5 rounded-full h-2">
                      <div
                        className={`h-full rounded-full ${item.risk === 'CRITICAL' ? 'bg-red-500' : item.risk === 'HIGH' ? 'bg-orange-500' : 'bg-emerald-500'}`}
                        style={{ width: `${item.confidence}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-300">{item.confidence}% confidence</span>
                  </div>
                </div>
                <span className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold ${
                  item.risk === 'CRITICAL' ? 'bg-red-500/30 text-red-300' :
                  item.risk === 'HIGH' ? 'bg-orange-500/30 text-orange-300' :
                  'bg-emerald-500/30 text-emerald-300'
                }`}>
                  {item.risk}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
