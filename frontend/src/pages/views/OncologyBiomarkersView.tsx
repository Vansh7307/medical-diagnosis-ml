import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'
import { MetricCard } from '../../components/MetricCard'
import { diagnosisAPI } from '../../services/api'

export default function OncologyBiomarkersView() {
  const [selectedMarker, setSelectedMarker] = useState('psa')
  const [markerValue, setMarkerValue] = useState(3.5)
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const trendData = useMemo(() => [
    { month: 'Jan', psa: 2.1, cea: 1.8, ca125: 15, af: 2.2 },
    { month: 'Feb', psa: 2.4, cea: 2.1, ca125: 18, af: 2.5 },
    { month: 'Mar', psa: 2.8, cea: 2.5, ca125: 22, af: 2.9 },
    { month: 'Apr', psa: 3.2, cea: 3.1, ca125: 28, af: 3.4 },
    { month: 'May', psa: 3.5, cea: 3.5, ca125: 35, af: 3.8 },
  ], [])

  const biomarkers = [
    { id: 'psa', name: 'PSA', unit: 'ng/mL', normal: '<4.0', current: 3.5, risk: 'moderate' },
    { id: 'cea', name: 'CEA', unit: 'ng/mL', normal: '<5.0', current: 2.8, risk: 'low' },
    { id: 'ca125', name: 'CA-125', unit: 'U/mL', normal: '<35', current: 28, risk: 'low' },
    { id: 'ca199', name: 'CA 19-9', unit: 'U/mL', normal: '<37', current: 18, risk: 'low' },
    { id: 'afp', name: 'AFP', unit: 'ng/mL', normal: '<10', current: 4.2, risk: 'low' },
  ]

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const { data } = await diagnosisAPI.oncology(selectedMarker, markerValue)
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
        <p className="eyebrow">Oncology Diagnostics</p>
        <h1 className="text-3xl font-bold text-white">Oncology Biomarkers & Tumor Screening</h1>
        <p className="text-slate-400 mt-2">Liquid biopsy biomarkers, tumor marker trend analysis, cancer stage classification with BRCA mutation screening</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Patients Screened" value={6234} accent="#22d3ee" />
        <MetricCard label="Cancers Detected" value={89} accent="#ef4444" />
        <MetricCard label="Avg Specificity" value="97.3%" accent="#34d399" />
        <MetricCard label="Stage I/II" value={67} accent="#f97316" />
      </div>

      {/* Biomarker Selection Grid */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">🎯 Tumor Biomarker Panel</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {biomarkers.map((marker) => (
            <button
              key={marker.id}
              onClick={() => {
                setSelectedMarker(marker.id)
                setMarkerValue(marker.current)
              }}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedMarker === marker.id
                  ? 'border-cyan-500 bg-cyan-500/20'
                  : 'border-white/10 hover:border-cyan-500/50'
              }`}
            >
              <p className="text-2xl mb-1">{marker.id === 'psa' ? '🔴' : marker.id === 'cea' ? '🟠' : '🟡'}</p>
              <p className="font-semibold text-white text-sm">{marker.name}</p>
              <p className="text-xs text-slate-400 mt-1">Normal: {marker.normal} {marker.unit}</p>
              <p className={`text-xs font-semibold mt-1 ${
                marker.risk === 'high' ? 'text-red-400' :
                marker.risk === 'moderate' ? 'text-orange-400' :
                'text-emerald-400'
              }`}>
                {marker.risk === 'high' ? '⚠️ High' : marker.risk === 'moderate' ? '⚡ Moderate' : '✓ Low'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Biomarker Value Input */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">📊 Enter Biomarker Level</h3>
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-white">
              {biomarkers.find(b => b.id === selectedMarker)?.name} Level
            </label>
            <span className="text-lg font-bold text-cyan-400">{markerValue.toFixed(1)} {biomarkers.find(b => b.id === selectedMarker)?.unit}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={markerValue}
            onChange={(e) => setMarkerValue(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-slate-400 mt-2">
            Normal range: {biomarkers.find(b => b.id === selectedMarker)?.normal}
          </p>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-red-500 to-pink-500 px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Analyzing Biomarker...' : 'Calculate Cancer Risk Score'}
        </button>
      </div>

      {/* Biomarker Trend Chart */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">📈 6-Month Biomarker Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="psa" stroke="#ef4444" strokeWidth={2} name="PSA" />
              <Line type="monotone" dataKey="cea" stroke="#f97316" strokeWidth={2} name="CEA" />
              <Line type="monotone" dataKey="ca125" stroke="#ec4899" strokeWidth={2} name="CA-125" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cancer Stage Risk Classification */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">🏥 Tumor Stage Classification</h3>
        <div className="space-y-2">
          {[
            { stage: 'Stage 0', risk: 'In Situ', confidence: 92, color: 'emerald' },
            { stage: 'Stage I/II', risk: 'Localized', confidence: 78, color: 'yellow' },
            { stage: 'Stage III', risk: 'Regional', confidence: 45, color: 'orange' },
            { stage: 'Stage IV', risk: 'Metastatic', confidence: 12, color: 'red' },
          ].map((item) => (
            <div key={item.stage} className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-300 w-20">{item.stage}</span>
              <div className="flex-1 bg-white/5 rounded-full h-2">
                <div
                  className={`h-full rounded-full bg-${item.color}-500`}
                  style={{ width: `${item.confidence}%` }}
                />
              </div>
              <span className={`text-sm font-semibold text-${item.color}-400 w-16`}>{item.confidence}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* BRCA Mutation Status */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">🧬 Hereditary Cancer Risk (BRCA Status)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
            <p className="font-semibold text-emerald-300">BRCA1 Status</p>
            <p className="text-sm text-slate-300 mt-2">✓ Negative (Wild-type)</p>
            <p className="text-xs text-slate-400 mt-1">Normal cancer risk</p>
          </div>
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
            <p className="font-semibold text-emerald-300">BRCA2 Status</p>
            <p className="text-sm text-slate-300 mt-2">✓ Negative (Wild-type)</p>
            <p className="text-xs text-slate-400 mt-1">Normal cancer risk</p>
          </div>
        </div>
      </div>

      {results && (
        <div className="glass-panel p-6 border-l-4 border-red-500">
          <h3 className="text-lg font-bold text-white mb-2">Analysis Results</h3>
          <pre className="bg-white/5 p-4 rounded-lg text-xs text-slate-300 overflow-auto max-h-48">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
