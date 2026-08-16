import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MetricCard } from '../../components/MetricCard'
import { diagnosisAPI } from '../../services/api'

export default function PathologyMicrobiologyView() {
  const [specimentType, setSpecimenType] = useState('biopsy')
  const [cultureOrganism, setCultureOrganism] = useState('bacteria')
  const [gramStain, setGramStain] = useState<'+' | '-'>('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const antibioticData = [
    { drug: 'Penicillin', resistance: 15 },
    { drug: 'Cephalosporin', resistance: 8 },
    { drug: 'Fluoroquinolone', resistance: 22 },
    { drug: 'Vancomycin', resistance: 2 },
    { drug: 'Azithromycin', resistance: 35 },
  ]

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const { data } = await diagnosisAPI.pathology({ specimen_type: specimentType, culture_organism: cultureOrganism, gram_stain: gramStain })
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
        <p className="eyebrow">Tissue & Microbiology</p>
        <h1 className="text-3xl font-bold text-white">Pathology & Microbiology Lab Analyzer</h1>
        <p className="text-slate-400 mt-2">Digital pathology slide viewer, biopsy histology analysis, bacterial culture sensitivity matrix</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Cultures Analyzed" value={2834} accent="#22d3ee" />
        <MetricCard label="Resistant Strains" value={127} accent="#ef4444" />
        <MetricCard label="Avg Sensitivity" value="93.7%" accent="#34d399" />
        <MetricCard label="Alerts" value={18} accent="#a78bfa" />
      </div>

      {/* Specimen Type & Culture Selection */}
      <div className="glass-panel p-6 space-y-6">
        <h3 className="text-lg font-bold text-white">🔬 Specimen Analysis</h3>

        <div>
          <label className="text-sm font-semibold text-white mb-3 block">Specimen Type</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { id: 'biopsy', label: '🩹 Tissue Biopsy' },
              { id: 'culture', label: '🧫 Bacterial Culture' },
              { id: 'fungal', label: '🍄 Fungal Culture' },
              { id: 'viral', label: '🦠 Viral Serology' },
              { id: 'stool', label: '💩 Stool Sample' },
              { id: 'csf', label: '🧠 CSF (Spinal)' },
            ].map((spec) => (
              <button
                key={spec.id}
                onClick={() => setSpecimenType(spec.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  specimentType === spec.id
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {spec.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-white mb-3 block">🦠 Culture Organism</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { id: 'bacteria', label: 'Bacteria' },
              { id: 'virus', label: 'Virus' },
              { id: 'fungus', label: 'Fungus' },
              { id: 'parasite', label: 'Parasite' },
              { id: 'mixed', label: 'Mixed Flora' },
              { id: 'no_growth', label: 'No Growth' },
            ].map((org) => (
              <button
                key={org.id}
                onClick={() => setCultureOrganism(org.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  cultureOrganism === org.id
                    ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {org.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-white mb-3 block">Gram Stain Result</label>
          <div className="flex gap-2">
            {['+', '-'].map((stain) => (
              <button
                key={stain}
                onClick={() => setGramStain(stain as any)}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                  gramStain === stain
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                Gram {stain}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || !gramStain}
          className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Analyzing Specimen...' : 'Analyze Culture & Sensitivity'}
        </button>
      </div>

      {/* Digital Pathology Viewer Simulation */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">🔬 Digital Pathology Slide Viewer</h3>
        <div className="relative w-full h-80 rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-800 flex items-center justify-center overflow-hidden group">
          {/* Simulated tissue texture */}
          <div className="absolute inset-0 opacity-10 bg-pattern" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10" />

          <div className="relative text-center pointer-events-none">
            <div className="text-5xl mb-3">🔬</div>
            <p className="text-slate-300 font-medium">Histopathology Slide View</p>
            <p className="text-xs text-slate-500 mt-2">Tissue Type: Adenocarcinoma Sample</p>
            <p className="text-xs text-cyan-400 mt-1">Magnification: 40x | Stain: H&E</p>
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white">🔍+</button>
            <button className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white">🔍−</button>
          </div>
        </div>
      </div>

      {/* Antibiotic Sensitivity Matrix */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">💊 Antibiotic Sensitivity Profile</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={antibioticData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="drug" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="resistance" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sensitivity Summary Table */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">📊 Resistance Profile</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left py-2 px-3 text-slate-300 font-semibold">Antibiotic</th>
                <th className="text-center py-2 px-3 text-slate-300 font-semibold">Resistant</th>
                <th className="text-center py-2 px-3 text-slate-300 font-semibold">Intermediate</th>
                <th className="text-center py-2 px-3 text-slate-300 font-semibold">Sensitive</th>
              </tr>
            </thead>
            <tbody>
              {['Amoxicillin', 'Doxycycline', 'Fluoroquinolone', 'Cephalosporin', 'Vancomycin'].map((drug) => (
                <tr key={drug} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-white font-medium">{drug}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="bg-red-500/20 text-red-300 text-xs font-semibold px-2 py-1 rounded">R</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="bg-yellow-500/20 text-yellow-300 text-xs font-semibold px-2 py-1 rounded">I</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2 py-1 rounded">S</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {results && (
        <div className="glass-panel p-6 border-l-4 border-orange-500">
          <h3 className="text-lg font-bold text-white mb-2">Analysis Results</h3>
          <pre className="bg-white/5 p-4 rounded-lg text-xs text-slate-300 overflow-auto max-h-48">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
