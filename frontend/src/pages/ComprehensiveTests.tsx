import { useState, useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MetricCard } from '../components/MetricCard'

type TestCategory = 'laboratory' | 'radiology' | 'cardiology_neuro' | 'batch_upload'

interface TestModule {
  category: TestCategory
  name: string
  description: string
  icon: string
  subtests: string[]
}

const testModules: TestModule[] = [
  {
    category: 'laboratory',
    name: '🧪 Laboratory Tests',
    description: 'Blood chemistry and diagnostic panels',
    icon: '🧬',
    subtests: [
      'Complete Blood Count (CBC)',
      'Comprehensive Metabolic Panel (CMP)',
      'Lipid Profile',
      'Thyroid & Endocrine (TSH, Free T3/T4, HbA1c)',
      'Electrolytes Panel',
      'Liver Function Tests',
      'Kidney Function Tests',
      'Coagulation Profile',
    ],
  },
  {
    category: 'radiology',
    name: '🩻 Radiology & Imaging Scans',
    description: 'Medical imaging and radiological analysis',
    icon: '🎨',
    subtests: [
      'Chest X-Ray (CXR)',
      'Brain MRI',
      'Abdominal CT Scan',
      'Pelvic Ultrasound',
      'Mammography',
      'Bone Density DEXA Scan',
      'Spinal MRI',
      'Cardiac CT Angiography',
    ],
  },
  {
    category: 'cardiology_neuro',
    name: '❤️ Cardiology & Neurology Signals',
    description: 'Cardiac and neurological waveform analysis',
    icon: '📊',
    subtests: [
      '12-Lead ECG/EKG Analysis',
      'Holter Monitor (24h ECG)',
      'Cardiac Echocardiogram',
      'Stress Test ECG',
      'EEG Brain Wave Activity',
      'Sleep Apnea Monitoring',
      'Intracranial Pressure Monitoring',
      'Neural Oscillation Analysis',
    ],
  },
  {
    category: 'batch_upload',
    name: '📥 Batch Data Upload',
    description: 'Automated parsing of lab reports and medical records',
    icon: '📋',
    subtests: [
      'CSV Lab Report Upload',
      'JSON Clinical Data Import',
      'Multi-File Batch Processing',
      'Auto-Format Detection',
      'Standard Lab Result Parsing',
      'DICOM Medical Image Import',
      'HL7 Message Processing',
      'Bulk Patient Record Migration',
    ],
  },
]

interface LabTestInputs {
  wbc?: number
  rbc?: number
  hemoglobin?: number
  glucose?: number
  creatinine?: number
}

export default function ComprehensiveTests() {
  const [activeCategory, setActiveCategory] = useState<TestCategory>('laboratory')
  const [selectedSubtest, setSelectedSubtest] = useState<string>('Complete Blood Count (CBC)')
  const [testInputs, setTestInputs] = useState<LabTestInputs>({})
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [results, setResults] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  const currentModule = useMemo(() => testModules.find((m) => m.category === activeCategory), [activeCategory])

  const performanceData = useMemo(
    () => [
      { test: 'Laboratory', sensitivity: 94.8, specificity: 96.2, ppv: 92.1 },
      { test: 'Radiology', sensitivity: 91.3, specificity: 93.7, ppv: 89.5 },
      { test: 'Cardiology', sensitivity: 96.5, specificity: 97.8, ppv: 95.9 },
      { test: 'Neurology', sensitivity: 88.2, specificity: 90.1, ppv: 86.7 },
    ],
    []
  )

  const trendData = useMemo(
    () => [
      { week: 'Week 1', abnormal: 8, normal: 92, flagged: 5 },
      { week: 'Week 2', abnormal: 6, normal: 94, flagged: 4 },
      { week: 'Week 3', abnormal: 5, normal: 95, flagged: 3 },
      { week: 'Week 4', abnormal: 4, normal: 96, flagged: 2 },
    ],
    []
  )

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files))
    }
  }

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      if (activeCategory === 'batch_upload' && uploadedFiles.length > 0) {
        // Handle batch file upload
        const formData = new FormData()
        uploadedFiles.forEach((file) => formData.append('files', file))
        const response = await fetch('/api/diagnosis/batch-upload', {
          method: 'POST',
          body: formData,
        })
        const data = await response.json()
        setResults(data)
      } else if (activeCategory === 'laboratory') {
        // Handle lab test analysis
        const response = await fetch('/api/diagnosis/analyze/laboratory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            panel_type: selectedSubtest.toLowerCase().includes('cbc')
              ? 'cbc'
              : selectedSubtest.toLowerCase().includes('metabolic')
                ? 'cmp'
                : selectedSubtest.toLowerCase().includes('lipid')
                  ? 'lipid'
                  : 'endocrine',
            ...testInputs,
          }),
        })
        const data = await response.json()
        setResults(data)
      } else if (activeCategory === 'cardiology_neuro') {
        // Handle ECG/EEG analysis
        const response = await fetch('/api/diagnosis/analyze/cardiology', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testInputs),
        })
        const data = await response.json()
        setResults(data)
      }
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
        <p className="eyebrow">Comprehensive Medical Testing Suite</p>
        <h1 className="text-3xl font-bold text-white">Clinical Test Workbench</h1>
        <p className="text-slate-400 mt-2">Execute any medical diagnostic test with automated data processing and clinical interpretation</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Tests Completed" value={2847} accent="#22d3ee" />
        <MetricCard label="Avg Turnaround" value="8.2 min" accent="#34d399" />
        <MetricCard label="Abnormal Results" value={42} accent="#f97316" />
        <MetricCard label="Clinical Reviews" value={16} accent="#a78bfa" />
      </div>

      {/* Test Category Navigation */}
      <div className="glass-panel overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 p-4">
          {testModules.map((module) => (
            <button
              key={module.category}
              onClick={() => {
                setActiveCategory(module.category)
                setSelectedSubtest(module.subtests[0])
              }}
              className={`relative overflow-hidden rounded-xl p-4 text-left transition-all ${
                activeCategory === module.category
                  ? 'ring-2 ring-cyan-500 bg-cyan-500/20 border border-cyan-500/30'
                  : 'border border-white/10 hover:border-cyan-500/50 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-3xl mb-2">{module.icon}</div>
              <h3 className="font-bold text-white mb-1">{module.name}</h3>
              <p className="text-xs text-slate-400 line-clamp-2">{module.description}</p>
              <p className="text-xs text-cyan-300 mt-2">{module.subtests.length} subtests</p>
            </button>
          ))}
        </div>
      </div>

      {/* Test Module Interface */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">{currentModule?.icon}</span>
          <div>
            <h2 className="text-xl font-bold text-white">{currentModule?.name}</h2>
            <p className="text-sm text-slate-400">{currentModule?.description}</p>
          </div>
        </div>

        {/* Subtest Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-300 mb-3">Select Test Type</label>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {currentModule?.subtests.map((subtest) => (
              <button
                key={subtest}
                onClick={() => setSelectedSubtest(subtest)}
                className={`px-3 py-2 rounded-lg text-sm transition-all text-left ${
                  selectedSubtest === subtest
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {subtest}
              </button>
            ))}
          </div>
        </div>

        {/* Test Input Interface */}
        {activeCategory === 'laboratory' && (
          <div className="mb-6 space-y-4">
            <p className="text-sm text-slate-400 font-medium">Enter laboratory values for {selectedSubtest}</p>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs text-slate-300 mb-2 font-medium">WBC (K/uL)</label>
                <input
                  type="number"
                  placeholder="3-30"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                  onChange={(e) => setTestInputs({ ...testInputs, wbc: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-2 font-medium">RBC (M/uL)</label>
                <input
                  type="number"
                  placeholder="3-7"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                  onChange={(e) => setTestInputs({ ...testInputs, rbc: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-2 font-medium">Hemoglobin (g/dL)</label>
                <input
                  type="number"
                  placeholder="7-20"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                  onChange={(e) => setTestInputs({ ...testInputs, hemoglobin: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-2 font-medium">Glucose (mg/dL)</label>
                <input
                  type="number"
                  placeholder="40-300"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                  onChange={(e) => setTestInputs({ ...testInputs, glucose: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-2 font-medium">Creatinine (mg/dL)</label>
                <input
                  type="number"
                  placeholder="0.6-1.3"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                  onChange={(e) => setTestInputs({ ...testInputs, creatinine: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'cardiology_neuro' && (
          <div className="mb-6 space-y-4">
            <p className="text-sm text-slate-400 font-medium">Enter cardiac/neuro signal parameters</p>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs text-slate-300 mb-2 font-medium">Heart Rate (bpm)</label>
                <input
                  type="number"
                  placeholder="60-100"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-2 font-medium">QT (ms)</label>
                <input
                  type="number"
                  placeholder="200-450"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-2 font-medium">PR (ms)</label>
                <input
                  type="number"
                  placeholder="120-200"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-2 font-medium">QRS (ms)</label>
                <input
                  type="number"
                  placeholder="80-120"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {activeCategory === 'batch_upload' && (
          <div className="mb-6 space-y-4">
            <p className="text-sm text-slate-400 font-medium">Upload lab reports or medical records (CSV, JSON, DICOM)</p>
            <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 p-8 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all cursor-pointer group">
              <input
                type="file"
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                accept=".csv,.json,.dcm,.hl7"
              />
              <div className="text-center pointer-events-none">
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📁</div>
                <p className="font-medium text-white mb-1">Drag files here or click to upload</p>
                <p className="text-xs text-slate-400">Supports CSV, JSON, DICOM, HL7 formats</p>
                <p className="text-xs text-cyan-400 mt-2">
                  {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div key={file.name} className="flex items-center gap-2 rounded-lg bg-white/5 p-2 text-sm text-slate-300">
                    <span>📄</span>
                    <span className="flex-1">{file.name}</span>
                    <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analysis Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Analyzing...' : `Run ${selectedSubtest} Analysis`}
        </button>
      </div>

      {/* Performance Benchmarks */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-white mb-4">Test Sensitivity & Specificity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="test" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sensitivity" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="specificity" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ppv" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold text-white mb-4">Result Trend (4 Weeks)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="week" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="normal" stroke="#34d399" strokeWidth={2} />
                <Line type="monotone" dataKey="abnormal" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="flagged" stroke="#f97316" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      {results && (
        <div className="glass-panel p-6 border-l-4 border-cyan-500">
          <h3 className="text-lg font-bold text-white mb-4">Analysis Results</h3>
          <div className="rounded-lg bg-white/5 p-4 text-sm text-slate-300 font-mono overflow-auto max-h-64">
            {JSON.stringify(results, null, 2)}
          </div>
        </div>
      )}
    </div>
  )
}
