import { useState, useMemo } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MetricCard } from '../../components/MetricCard'
import { diagnosisAPI } from '../../services/api'

export default function CardiologySignalsView() {
  const [ecgValues, setEcgValues] = useState({
    heart_rate: 72,
    pr_interval: 160,
    qrs_duration: 100,
    qt_interval: 400,
    st_segment: 0,
    t_wave_amp: 5,
    rhythm: 'regular' as 'regular' | 'irregular',
  })
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const ecgTrendData = useMemo(
    () => [
      { time: '00:00', hr: 68, qrc: 98, qt: 395 },
      { time: '03:00', hr: 62, qrc: 100, qt: 408 },
      { time: '06:00', hr: 71, qrc: 99, qt: 402 },
      { time: '09:00', hr: 75, qrc: 101, qt: 415 },
      { time: '12:00', hr: 80, qrc: 102, qt: 420 },
      { time: '15:00', hr: 78, qrc: 100, qt: 410 },
      { time: '18:00', hr: 72, qrc: 99, qt: 405 },
      { time: '21:00', hr: 69, qrc: 98, qt: 400 },
    ],
    []
  )

  const waveformData = useMemo(
    () =>
      Array.from({ length: 100 }, (_, i) => ({
        x: i,
        signal:
          Math.sin((i * Math.PI) / 12) * 2 +
          Math.sin((i * Math.PI) / 25) * 1.5 +
          Math.cos((i * Math.PI) / 50) * 0.5 +
          (Math.random() - 0.5) * 0.2,
      })),
    []
  )

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const { data } = await diagnosisAPI.cardiology(ecgValues)
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
        <p className="eyebrow">Cardiac Diagnostics</p>
        <h1 className="text-3xl font-bold text-white">ECG/EKG & Cardiology Signals Analyzer</h1>
        <p className="text-slate-400 mt-2">12-Lead ECG analysis, arrhythmia detection, waveform interpretation with QTc calculation</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="ECGs Analyzed" value={8934} accent="#22d3ee" />
        <MetricCard label="Arrhythmias" value={127} accent="#ef4444" />
        <MetricCard label="Avg Sensitivity" value="97.1%" accent="#34d399" />
        <MetricCard label="Critical Alerts" value={8} accent="#a78bfa" />
      </div>

      {/* ECG Waveform Viewer */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">📈 12-Lead ECG Waveform</h3>
        <div className="h-56 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 p-4 border border-white/10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={waveformData}>
              <defs>
                <linearGradient id="colorSignal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="x" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[-3, 3]} />
              <Tooltip />
              <Area type="monotone" dataKey="signal" stroke="#22d3ee" strokeWidth={2} fill="url(#colorSignal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ECG Parameter Inputs */}
      <div className="glass-panel p-6 space-y-6">
        <h3 className="text-lg font-bold text-white">⚙️ ECG Parameters & Intervals</h3>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Heart Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">❤️ Heart Rate (bpm)</label>
              <span className={`font-semibold ${ecgValues.heart_rate > 100 || ecgValues.heart_rate < 60 ? 'text-red-400' : 'text-cyan-400'}`}>
                {ecgValues.heart_rate}
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="180"
              value={ecgValues.heart_rate}
              onChange={(e) => setEcgValues({ ...ecgValues, heart_rate: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-1">Normal: 60-100 bpm</p>
          </div>

          {/* PR Interval */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">📏 PR Interval (ms)</label>
              <span className={`font-semibold ${ecgValues.pr_interval < 120 || ecgValues.pr_interval > 200 ? 'text-red-400' : 'text-cyan-400'}`}>
                {ecgValues.pr_interval}
              </span>
            </div>
            <input
              type="range"
              min="80"
              max="280"
              step="5"
              value={ecgValues.pr_interval}
              onChange={(e) => setEcgValues({ ...ecgValues, pr_interval: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-1">Normal: 120-200 ms</p>
          </div>

          {/* QRS Duration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">📊 QRS Duration (ms)</label>
              <span className={`font-semibold ${ecgValues.qrs_duration < 80 || ecgValues.qrs_duration > 120 ? 'text-red-400' : 'text-cyan-400'}`}>
                {ecgValues.qrs_duration}
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              step="5"
              value={ecgValues.qrs_duration}
              onChange={(e) => setEcgValues({ ...ecgValues, qrs_duration: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-1">Normal: 80-120 ms</p>
          </div>

          {/* QT Interval */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">⏱️ QT Interval (ms)</label>
              <span className={`font-semibold ${ecgValues.qt_interval < 200 || ecgValues.qt_interval > 450 ? 'text-red-400' : 'text-cyan-400'}`}>
                {ecgValues.qt_interval}
              </span>
            </div>
            <input
              type="range"
              min="160"
              max="550"
              step="5"
              value={ecgValues.qt_interval}
              onChange={(e) => setEcgValues({ ...ecgValues, qt_interval: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-1">Normal: 200-450 ms (gender dependent)</p>
          </div>

          {/* ST Segment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">📍 ST Segment (mm)</label>
              <span className={`font-semibold ${Math.abs(ecgValues.st_segment) > 1 ? 'text-red-400' : 'text-cyan-400'}`}>
                {ecgValues.st_segment > 0 ? '+' : ''}{ecgValues.st_segment}
              </span>
            </div>
            <input
              type="range"
              min="-3"
              max="3"
              step="0.1"
              value={ecgValues.st_segment}
              onChange={(e) => setEcgValues({ ...ecgValues, st_segment: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-1">Normal: ~0 mm (isoelectric)</p>
          </div>

          {/* T-Wave Amplitude */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">🌊 T-Wave (mm)</label>
              <span className={`font-semibold ${Math.abs(ecgValues.t_wave_amp) > 10 ? 'text-red-400' : 'text-cyan-400'}`}>
                {ecgValues.t_wave_amp}
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.5"
              value={ecgValues.t_wave_amp}
              onChange={(e) => setEcgValues({ ...ecgValues, t_wave_amp: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-1">Normal: ±5 to ±10 mm</p>
          </div>
        </div>

        {/* Rhythm Selection */}
        <div>
          <label className="text-sm font-semibold text-white mb-3 block">🔄 Rhythm Type</label>
          <div className="flex gap-3">
            {['regular', 'irregular'].map((type) => (
              <button
                key={type}
                onClick={() => setEcgValues({ ...ecgValues, rhythm: type as any })}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  ecgValues.rhythm === type
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {type === 'regular' ? '✓ Regular Sinus' : '⚠️ Irregular (Arrhythmia)'}
              </button>
            ))}
          </div>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-red-500 to-pink-500 px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Analyzing ECG...' : 'Analyze ECG & Detect Arrhythmias'}
        </button>
      </div>

      {/* Trend Chart */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">📊 24-Hour Trend (Heart Rate, QRS, QT)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ecgTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2} name="HR (bpm)" />
              <Line type="monotone" dataKey="qrc" stroke="#22d3ee" strokeWidth={2} name="QRS (ms)" />
              <Line type="monotone" dataKey="qt" stroke="#a78bfa" strokeWidth={2} name="QT (ms)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Arrhythmia Risk Assessment */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">⚠️ Arrhythmia Risk Assessment</h3>
        <div className="space-y-3">
          {[
            { type: 'Normal Sinus Rhythm', prob: 92, color: 'emerald' },
            { type: 'Atrial Fibrillation', prob: 5, color: 'yellow' },
            { type: 'Ventricular Tachycardia', prob: 2, color: 'red' },
            { type: 'AV Block', prob: 1, color: 'orange' },
          ].map((item) => (
            <div key={item.type} className="flex items-center gap-3">
              <span className="text-sm text-slate-300 w-32">{item.type}</span>
              <div className="flex-1 bg-white/5 rounded-full h-2">
                <div
                  className={`h-full rounded-full bg-${item.color}-500`}
                  style={{ width: `${item.prob}%` }}
                />
              </div>
              <span className={`text-sm font-semibold text-${item.color}-400`}>{item.prob}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
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
