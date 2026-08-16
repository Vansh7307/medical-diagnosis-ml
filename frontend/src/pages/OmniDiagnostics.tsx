import { useState, useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MetricCard } from '../components/MetricCard'

type DiagnosticCategory = 'laboratory' | 'cardiology' | 'radiology' | 'genomic' | 'microbiology'

interface DiagnosticTab {
  key: DiagnosticCategory
  label: string
  icon: string
  description: string
}

const diagnosticTabs: DiagnosticTab[] = [
  { key: 'laboratory', label: '🧪 Laboratory Workbench', icon: '🧬', description: 'Blood chemistry, CBC, metabolic panels' },
  { key: 'cardiology', label: '❤️ Cardiology Suite', icon: '📊', description: 'ECG/EKG analysis, arrhythmia detection' },
  { key: 'radiology', label: '🖼️ Radiology Studio', icon: '🎨', description: 'Imaging scans, heatmap visualization' },
  { key: 'genomic', label: '🧬 Genomic Engine', icon: '🔬', description: 'SNP variants, polygenic risk scores' },
  { key: 'microbiology', label: '🦠 Microbiology Lab', icon: '🧫', description: 'Pathogen identification, antibiotic sensitivity' },
]

const labPanels = [
  { name: 'CBC', shortName: 'Complete Blood Count', icon: '🩸' },
  { name: 'CMP', shortName: 'Comprehensive Metabolic Panel', icon: '⚗️' },
  { name: 'Lipid', shortName: 'Lipid & Cardiovascular Panel', icon: '💓' },
  { name: 'Endocrine', shortName: 'Hormone & Endocrine Panel', icon: '🏗️' },
  { name: 'Oncology', shortName: 'Tumor Biomarkers', icon: '🎯' },
]

export default function OmniDiagnostics() {
  const [activeCategory, setActiveCategory] = useState<DiagnosticCategory>('laboratory')
  const [selectedPanel, setSelectedPanel] = useState<string>('CBC')
  const [features, setFeatures] = useState<Record<string, number>>({})
  const [results, setResults] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  const performanceData = useMemo(() => [
    { model: 'Cardiac', accuracy: 96.2, sensitivity: 94.1, specificity: 97.8 },
    { model: 'Metabolic', accuracy: 93.7, sensitivity: 91.2, specificity: 95.3 },
    { model: 'Oncology', accuracy: 94.9, sensitivity: 92.8, specificity: 96.5 },
    { model: 'Genomic', accuracy: 88.4, sensitivity: 86.1, specificity: 90.2 },
  ], [])

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      // Simulate API call to backend diagnostic endpoint
      const response = await fetch(`/api/diagnosis/analyze/${activeCategory}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panel_type: selectedPanel.toLowerCase(),
          features,
        }),
      })
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'laboratory':
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {labPanels.map((panel) => (
                <button
                  key={panel.name}
                  onClick={() => setSelectedPanel(panel.name)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedPanel === panel.name
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-white/10 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="text-2xl mb-2">{panel.icon}</div>
                  <p className="font-semibold text-white">{panel.name}</p>
                  <p className="text-xs text-slate-400">{panel.shortName}</p>
                </button>
              ))}
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold text-white mb-4">{selectedPanel} Input Form</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Sample Parameter 1</label>
                  <input
                    type="number"
                    placeholder="Enter value"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                    onChange={(e) => setFeatures({ ...features, param1: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Sample Parameter 2</label>
                  <input
                    type="number"
                    placeholder="Enter value"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                    onChange={(e) => setFeatures({ ...features, param2: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="mt-4 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze Laboratory Panel'}
              </button>
            </div>
          </div>
        )

      case 'cardiology':
        return (
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold text-white mb-4">12-Lead ECG Analysis</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    placeholder="60-100"
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">QT Interval (ms)</label>
                  <input type="number" placeholder="200-450" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">PR Interval (ms)</label>
                  <input type="number" placeholder="120-200" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white" />
                </div>
              </div>
              <button className="mt-4 w-full rounded-lg bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 font-medium text-white hover:opacity-90">
                Analyze ECG Signal
              </button>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4">Arrhythmia Risk Assessment</h3>
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between">
                  <span className="text-slate-300">Normal Sinus Rhythm Probability</span>
                  <span className="text-emerald-400 font-semibold">92%</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between">
                  <span className="text-slate-300">Atrial Fibrillation Risk</span>
                  <span className="text-yellow-400 font-semibold">5%</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between">
                  <span className="text-slate-300">Ventricular Arrhythmia Risk</span>
                  <span className="text-red-400 font-semibold">2%</span>
                </div>
              </div>
            </div>
          </div>
        )

      case 'radiology':
        return (
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold text-white mb-4">Multi-Modal Imaging Studio</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                {['Chest X-Ray', 'CT Scan', 'Brain MRI', 'Mammography', 'Ultrasound', 'PET Scan'].map((modality) => (
                  <button key={modality} className="p-4 rounded-xl border border-white/10 hover:bg-white/10 transition text-center">
                    <div className="text-3xl mb-2">📊</div>
                    <p className="font-medium text-white">{modality}</p>
                    <p className="text-xs text-slate-400">Click to analyze</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4">Automated Anomaly Detection</h3>
              <div className="relative h-80 rounded-xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-slate-900 p-6 overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-12 left-16 w-32 h-24 rounded-lg border-2 border-cyan-400" />
                  <div className="absolute top-20 right-20 w-24 h-32 rounded-full border-2 border-red-400" />
                  <div className="absolute bottom-16 left-32 w-28 h-20 rounded-lg border-2 border-yellow-400" />
                </div>
                <div className="relative flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <div className="text-6xl mb-2">🔍</div>
                    <p>Upload or select imaging file for analysis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'genomic':
        return (
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold text-white mb-4">Polygenic Risk Score Calculator</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {['Cardiovascular', 'Oncological', 'Neurological'].map((category) => (
                  <div key={category} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400 mb-2">{category} PRS</p>
                    <div className="text-2xl font-bold text-cyan-400 mb-2">62%</div>
                    <div className="text-xs text-slate-400">High risk percentile</div>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 font-medium text-white hover:opacity-90">
                Calculate Genomic Risk Profile
              </button>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4">Variant Interpretation</h3>
              <div className="space-y-3">
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                  <p className="font-medium text-red-300">4 Pathogenic Variants Detected</p>
                  <p className="text-xs text-red-200 mt-1">Requires urgent clinical review</p>
                </div>
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
                  <p className="font-medium text-yellow-300">8 Likely Benign Variants</p>
                  <p className="text-xs text-yellow-200 mt-1">Low clinical significance</p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'microbiology':
        return (
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold text-white mb-4">Culture & Sensitivity Analysis</h3>
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Organism Type</label>
                  <select className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white">
                    <option>Bacteria</option>
                    <option>Virus</option>
                    <option>Fungus</option>
                    <option>Parasite</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Culture Growth Time (hours)</label>
                  <input type="number" placeholder="0-72" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white" />
                </div>
              </div>
              <button className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 font-medium text-white hover:opacity-90">
                Analyze Culture Results
              </button>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4">Antibiotic Sensitivity Profile</h3>
              <div className="space-y-2">
                {['Penicillin', 'Cephalosporin', 'Fluoroquinolone', 'Vancomycin'].map((antibiotic, idx) => (
                  <div key={antibiotic} className="flex items-center justify-between rounded-lg bg-white/5 p-2">
                    <span className="text-sm text-slate-300">{antibiotic}</span>
                    <span className={`text-xs font-semibold ${idx % 2 === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {idx % 2 === 0 ? 'Sensitive' : 'Resistant'}
                    </span>
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

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div>
        <p className="eyebrow">Omni-Diagnostic Platform</p>
        <h1 className="text-3xl font-bold text-white">Medical Intelligence Hub</h1>
        <p className="text-slate-400 mt-2">Comprehensive diagnostic analysis across all medical specialties</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Active Diagnostics" value={156} accent="#22d3ee" />
        <MetricCard label="Avg Confidence" value="94.2%" accent="#34d399" />
        <MetricCard label="Anomalies Flagged" value={12} accent="#f97316" />
        <MetricCard label="Clinical Reviews" value={8} accent="#a78bfa" />
      </div>

      {/* Diagnostic Category Tabs */}
      <div className="glass-panel overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-white/10 p-3 overflow-x-auto">
          {diagnosticTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all ${
                activeCategory === tab.key
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6">{renderCategoryContent()}</div>
      </div>

      {/* Model Performance Benchmarks */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">Diagnostic Model Performance</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="model" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="accuracy" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sensitivity" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="specificity" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Analysis Results (if available) */}
      {results && (
        <div className="glass-panel p-6 border-l-4 border-cyan-500">
          <h3 className="text-lg font-bold text-white mb-4">Latest Analysis Results</h3>
          <div className="rounded-lg bg-white/5 p-4 text-sm text-slate-300 font-mono overflow-auto max-h-48">
            {JSON.stringify(results, null, 2)}
          </div>
        </div>
      )}
    </div>
  )
}
