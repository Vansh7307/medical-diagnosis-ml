import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MetricCard } from '../../components/MetricCard'
import { diagnosisAPI } from '../../services/api'

export default function NeurologyView() {
  const [assessmentType, setAssessmentType] = useState<'mmse' | 'moca' | 'eeg'>('mmse')
  const [mmseScore, setMmseScore] = useState(28)
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const mmseQuestions = [
    { item: 'Orientation to Time', score: 5, max: 5 },
    { item: 'Orientation to Place', score: 5, max: 5 },
    { item: 'Registration', score: 3, max: 3 },
    { item: 'Attention/Calculation', score: 5, max: 5 },
    { item: 'Recall', score: 3, max: 3 },
    { item: 'Language', score: 2, max: 8 },
  ]

  const eegData = [
    { band: 'Delta (0-4)', power: 15 },
    { band: 'Theta (4-8)', power: 22 },
    { band: 'Alpha (8-12)', power: 45 },
    { band: 'Beta (12-30)', power: 30 },
    { band: 'Gamma (30+)', power: 18 },
  ]

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const { data } = await diagnosisAPI.neurology(assessmentType, mmseScore)
      setResults(data)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <p className="eyebrow">Neuropsychology</p>
        <h1 className="text-3xl font-bold text-white">Neurology & Mental Health Assessment</h1>
        <p className="text-slate-400 mt-2">Cognitive battery scoring (MMSE, MoCA), EEG frequency analysis, neuro-imaging metrics, psychiatric symptom tracking</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Patients Assessed" value={1847} accent="#22d3ee" />
        <MetricCard label="Cognitive Decline" value={23} accent="#f97316" />
        <MetricCard label="Dementia Cases" value={12} accent="#ef4444" />
        <MetricCard label="Alerts" value={7} accent="#a78bfa" />
      </div>

      {/* Assessment Type Selection */}
      <div className="glass-panel p-6 space-y-6">
        <h3 className="text-lg font-bold text-white">🧠 Cognitive & Neuro Assessment</h3>

        <div>
          <label className="text-sm font-semibold text-white mb-3 block">Assessment Type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'mmse', label: '📋 MMSE (30 points)' },
              { id: 'moca', label: '📝 MoCA (30 points)' },
              { id: 'eeg', label: '📊 EEG Analysis' },
            ].map((assess) => (
              <button
                key={assess.id}
                onClick={() => setAssessmentType(assess.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  assessmentType === assess.id
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {assess.label}
              </button>
            ))}
          </div>
        </div>

        {assessmentType === 'mmse' && (
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Mini-Mental State Examination (MMSE) Score
            </label>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-300">Total Score</span>
                <span className={`text-2xl font-bold ${
                  mmseScore >= 24 ? 'text-emerald-400' :
                  mmseScore >= 18 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {mmseScore} / 30
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={mmseScore}
                onChange={(e) => setMmseScore(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-xs font-semibold text-slate-400 mb-2">Score Breakdown</div>
              {mmseQuestions.map((q) => (
                <div key={q.item} className="flex items-center justify-between rounded-lg bg-white/5 p-2">
                  <span className="text-sm text-slate-300">{q.item}</span>
                  <span className="text-sm font-semibold text-cyan-400">{q.score}/{q.max}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Analyzing Assessment...' : 'Analyze Cognitive Status'}
        </button>
      </div>

      {/* MMSE Result Interpretation */}
      {assessmentType === 'mmse' && (
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-white mb-4">📊 MMSE Interpretation</h3>
          <div className="space-y-2">
            {[
              { range: '24-30', status: 'Normal', color: 'emerald' },
              { range: '18-23', status: 'Mild Cognitive Impairment', color: 'yellow' },
              { range: '0-17', status: 'Moderate to Severe Dementia', color: 'red' },
            ].map((item) => (
              <div
                key={item.range}
                className={`p-3 rounded-lg border-l-4 flex items-center justify-between ${
                  item.color === 'emerald' ? 'border-emerald-500 bg-emerald-500/10' :
                  item.color === 'yellow' ? 'border-yellow-500 bg-yellow-500/10' :
                  'border-red-500 bg-red-500/10'
                }`}
              >
                <span className={`font-medium ${
                  item.color === 'emerald' ? 'text-emerald-300' :
                  item.color === 'yellow' ? 'text-yellow-300' :
                  'text-red-300'
                }`}>
                  {item.range}
                </span>
                <span className="text-sm text-slate-300">{item.status}</span>
              </div>
            ))}
          </div>

          <div className={`mt-4 p-4 rounded-lg border-l-4 ${
            mmseScore >= 24 ? 'border-emerald-500 bg-emerald-500/10' :
            mmseScore >= 18 ? 'border-yellow-500 bg-yellow-500/10' :
            'border-red-500 bg-red-500/10'
          }`}>
            <p className={`font-semibold ${
              mmseScore >= 24 ? 'text-emerald-300' :
              mmseScore >= 18 ? 'text-yellow-300' :
              'text-red-300'
            }`}>
              Current Status: {
                mmseScore >= 24 ? '✓ Normal Cognition' :
                mmseScore >= 18 ? '⚡ Mild Cognitive Decline' :
                '⚠️ Significant Cognitive Impairment'
              }
            </p>
          </div>
        </div>
      )}

      {/* EEG Frequency Analysis */}
      {assessmentType === 'eeg' && (
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-white mb-4">📊 EEG Brain Wave Frequency Spectrum</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eegData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="band" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="power" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Psychiatric Symptom Scoring */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">🏥 Psychiatric Symptom Screening</h3>
        <div className="space-y-3">
          {[
            { symptom: 'Depression (PHQ-9)', score: 8, severity: 'mild' },
            { symptom: 'Anxiety (GAD-7)', score: 5, severity: 'mild' },
            { symptom: 'Sleep Disturbance', score: 3, severity: 'normal' },
            { symptom: 'Cognitive Fog', score: 2, severity: 'normal' },
          ].map((item) => (
            <div key={item.symptom} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
              <span className="text-sm text-slate-300">{item.symptom}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-cyan-400">{item.score}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  item.severity === 'normal' ? 'bg-emerald-500/20 text-emerald-300' :
                  item.severity === 'mild' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {item.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {results && (
        <div className="glass-panel p-6 border-l-4 border-purple-500">
          <h3 className="text-lg font-bold text-white mb-2">Analysis Results</h3>
          <pre className="bg-white/5 p-4 rounded-lg text-xs text-slate-300 overflow-auto max-h-48">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
