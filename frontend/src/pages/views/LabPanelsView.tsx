import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MetricCard } from '../../components/MetricCard'
import { diagnosisAPI } from '../../services/api'

export default function LabPanelsView() {
  const [activePanel, setActivePanel] = useState<'cbc' | 'cmp' | 'lipid' | 'endocrine'>('cbc')
  const [labValues, setLabValues] = useState({
    // CBC
    wbc: 7.5,
    rbc: 4.8,
    hemoglobin: 14.2,
    platelets: 250,
    // CMP
    glucose: 95,
    creatinine: 0.9,
    bun: 18,
    sodium: 138,
    // Lipid
    total_cholesterol: 180,
    hdl: 50,
    ldl: 110,
    triglycerides: 100,
    // Endocrine
    tsh: 2.5,
    free_t4: 1.2,
    hba1c: 5.5,
  })
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const riskData = useMemo(
    () => [
      { marker: 'WBC', risk: 15, normal: 85 },
      { marker: 'Glucose', risk: 22, normal: 78 },
      { marker: 'Creatinine', risk: 8, normal: 92 },
      { marker: 'LDL', risk: 18, normal: 82 },
      { marker: 'TSH', risk: 5, normal: 95 },
    ],
    []
  )

  const handleSliderChange = (key: string, value: number) => {
    setLabValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const { data } = await diagnosisAPI.labs(activePanel, labValues)
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
        <p className="eyebrow">Laboratory Analysis</p>
        <h1 className="text-3xl font-bold text-white">Blood Panels & Lab Chemistry Analyzer</h1>
        <p className="text-slate-400 mt-2">Interactive biomarker entry with live risk calculation and sensitivity analysis</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Tests Processed" value={18493} accent="#22d3ee" />
        <MetricCard label="Abnormal Flags" value={127} accent="#f97316" />
        <MetricCard label="Avg Risk Score" value="32.1" accent="#ef4444" />
        <MetricCard label="Clinical Alerts" value={23} accent="#a78bfa" />
      </div>

      {/* Panel Selector */}
      <div className="glass-panel overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4">
          {['cbc', 'cmp', 'lipid', 'endocrine'].map((panel) => (
            <button
              key={panel}
              onClick={() => setActivePanel(panel as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activePanel === panel
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {panel === 'cbc'
                ? '🩸 CBC'
                : panel === 'cmp'
                  ? '⚗️ CMP'
                  : panel === 'lipid'
                    ? '💓 Lipid'
                    : '🏗️ Endocrine'}
            </button>
          ))}
        </div>
      </div>

      {/* Lab Values Input with Interactive Sliders */}
      <div className="glass-panel p-6 space-y-6">
        <h3 className="text-lg font-bold text-white">
          {activePanel === 'cbc'
            ? '🩸 Complete Blood Count (CBC)'
            : activePanel === 'cmp'
              ? '⚗️ Comprehensive Metabolic Panel (CMP)'
              : activePanel === 'lipid'
                ? '💓 Lipid Profile'
                : '🏗️ Thyroid & Endocrine Panel'}
        </h3>

        <div className="space-y-4">
          {activePanel === 'cbc' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">WBC (3-11 K/uL)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.wbc.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.1"
                  value={labValues.wbc}
                  onChange={(e) => handleSliderChange('wbc', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">RBC (4-6 M/uL)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.rbc.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="0.1"
                  value={labValues.rbc}
                  onChange={(e) => handleSliderChange('rbc', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Hemoglobin (12-18 g/dL)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.hemoglobin.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="20"
                  step="0.1"
                  value={labValues.hemoglobin}
                  onChange={(e) => handleSliderChange('hemoglobin', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Platelets (150-400 K/uL)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.platelets.toFixed(0)}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="600"
                  step="1"
                  value={labValues.platelets}
                  onChange={(e) => handleSliderChange('platelets', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}

          {activePanel === 'cmp' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Glucose (70-100 mg/dL)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.glucose.toFixed(0)}</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="300"
                  step="1"
                  value={labValues.glucose}
                  onChange={(e) => handleSliderChange('glucose', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Creatinine (0.6-1.3 mg/dL)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.creatinine.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="3"
                  step="0.05"
                  value={labValues.creatinine}
                  onChange={(e) => handleSliderChange('creatinine', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">BUN (7-20 mg/dL)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.bun.toFixed(0)}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="50"
                  step="1"
                  value={labValues.bun}
                  onChange={(e) => handleSliderChange('bun', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Sodium (135-145 mEq/L)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.sodium.toFixed(0)}</span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="160"
                  step="1"
                  value={labValues.sodium}
                  onChange={(e) => handleSliderChange('sodium', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}

          {activePanel === 'lipid' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Total Cholesterol (&lt;200 mg/dL)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.total_cholesterol.toFixed(0)}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="400"
                  step="1"
                  value={labValues.total_cholesterol}
                  onChange={(e) => handleSliderChange('total_cholesterol', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-white">HDL (&gt;40 mg/dL)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.hdl.toFixed(0)}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={labValues.hdl}
                  onChange={(e) => handleSliderChange('hdl', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">LDL (&lt;130 mg/dL)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.ldl.toFixed(0)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  step="1"
                  value={labValues.ldl}
                  onChange={(e) => handleSliderChange('ldl', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Triglycerides (&lt;150 mg/dL)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.triglycerides.toFixed(0)}</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="500"
                  step="1"
                  value={labValues.triglycerides}
                  onChange={(e) => handleSliderChange('triglycerides', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}

          {activePanel === 'endocrine' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">TSH (0.4-4.0 mIU/L)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.tsh.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={labValues.tsh}
                  onChange={(e) => handleSliderChange('tsh', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">Free T4 (0.8-2.0 ng/dL)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.free_t4.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="4"
                  step="0.1"
                  value={labValues.free_t4}
                  onChange={(e) => handleSliderChange('free_t4', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white">HbA1c (&lt;5.7%)</label>
                  <span className="text-cyan-400 font-semibold">{labValues.hba1c.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="15"
                  step="0.1"
                  value={labValues.hba1c}
                  onChange={(e) => handleSliderChange('hba1c', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Analyzing Lab Values...' : 'Analyze & Calculate Risk'}
        </button>
      </div>

      {/* Biomarker Risk Visualization */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">📊 Biomarker Risk Heatmap</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={riskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="marker" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="normal" stroke="#34d399" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="glass-panel p-6 border-l-4 border-cyan-500">
          <h3 className="text-lg font-bold text-white mb-2">Analysis Results</h3>
          <pre className="bg-white/5 p-4 rounded-lg text-xs text-slate-300 overflow-auto max-h-48">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
