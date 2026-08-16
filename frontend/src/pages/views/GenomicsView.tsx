import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { MetricCard } from '../../components/MetricCard'
import { diagnosisAPI } from '../../services/api'

export default function GenomicsView() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [analysisType, setAnalysisType] = useState<'prs' | 'snp' | 'brca'>('prs')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const prsData = [
    { category: 'Cardiovascular', value: 72 },
    { category: 'Oncological', value: 58 },
    { category: 'Neurological', value: 45 },
    { category: 'Metabolic', value: 61 },
    { category: 'Autoimmune', value: 38 },
  ]

  const variantData = [
    { variant: 'BRCA1', pathogenic: true, freq: 0.001 },
    { variant: 'APOE4', pathogenic: true, freq: 0.15 },
    { variant: 'MTHFR C677T', pathogenic: false, freq: 0.32 },
    { variant: 'Factor V Leiden', pathogenic: true, freq: 0.05 },
    { variant: 'Prothrombin G20210A', pathogenic: true, freq: 0.02 },
  ]

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploadedFile(e.target.files[0])
    }
  }

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const { data } = await diagnosisAPI.genomics({
        snp_count: uploadedFile ? 2400 : 0,
        cardiovascular_prs: analysisType === 'prs' ? 72 : 50,
        oncological_prs: analysisType === 'brca' ? 68 : 58,
        neurological_prs: 45,
        consanguinity_flag: false,
        pathogenic_variant_count: analysisType === 'brca' ? 1 : 0,
      })
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
        <p className="eyebrow">Genetic Analysis</p>
        <h1 className="text-3xl font-bold text-white">Genomics & DNA Sequence Engine</h1>
        <p className="text-slate-400 mt-2">Polygenic risk scores, SNP variant analysis, hereditary predisposition mapping with FASTQ/VCF parsing</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Genomes Analyzed" value={4521} accent="#22d3ee" />
        <MetricCard label="Pathogenic Variants" value={187} accent="#ef4444" />
        <MetricCard label="Avg PRS" value="58.3" accent="#34d399" />
        <MetricCard label="Risk Alerts" value={42} accent="#a78bfa" />
      </div>

      {/* Upload & Analysis Type */}
      <div className="glass-panel p-6 space-y-6">
        <h3 className="text-lg font-bold text-white">📁 Genomic File Upload</h3>

        <div>
          <label className="block text-sm font-semibold text-white mb-3">FASTQ / VCF Sequence File</label>
          <div className="relative flex items-center justify-center rounded-xl border-2 border-dashed border-purple-500/30 bg-purple-500/5 p-8 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all cursor-pointer">
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              accept=".fastq,.vcf,.fq"
            />
            <div className="text-center pointer-events-none">
              <div className="text-4xl mb-2">🧬</div>
              <p className="font-medium text-white">Drag FASTQ/VCF or click to upload</p>
              {uploadedFile && <p className="text-xs text-purple-400 mt-2">📄 {uploadedFile.name}</p>}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-white mb-3 block">Analysis Type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'prs', label: '📊 Polygenic Risk', icon: '📊' },
              { id: 'snp', label: '🔍 SNP Variants', icon: '🔍' },
              { id: 'brca', label: '⚠️ BRCA Screening', icon: '⚠️' },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setAnalysisType(type.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  analysisType === type.id
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || !uploadedFile}
          className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Analyzing Sequence...' : 'Analyze Genomic Data'}
        </button>
      </div>

      {/* Polygenic Risk Score Radar */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">🎯 Polygenic Risk Score (PRS) Radar</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={prsData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="category" stroke="#94a3b8" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#94a3b8" />
              <Radar name="Risk Percentile" dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SNP Variant Table */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">🔍 Detected Genetic Variants</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left py-2 px-3 text-slate-300 font-semibold">SNP Variant</th>
                <th className="text-left py-2 px-3 text-slate-300 font-semibold">Pathogenic</th>
                <th className="text-left py-2 px-3 text-slate-300 font-semibold">Population Freq</th>
                <th className="text-left py-2 px-3 text-slate-300 font-semibold">Clinical Impact</th>
              </tr>
            </thead>
            <tbody>
              {variantData.map((variant) => (
                <tr key={variant.variant} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-white font-medium">{variant.variant}</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      variant.pathogenic
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {variant.pathogenic ? '🔴 Pathogenic' : '✓ Benign'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">{(variant.freq * 100).toFixed(2)}%</td>
                  <td className="py-3 px-3 text-cyan-300">
                    {variant.pathogenic ? '⚠️ High Risk' : '✓ Low Risk'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Profile Summary */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">📋 Genomic Risk Profile</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-red-500/10 border-l-4 border-red-500 p-4">
            <span className="text-white font-semibold">Pathogenic Variants Detected</span>
            <span className="text-red-400 text-xl font-bold">4</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-orange-500/10 border-l-4 border-orange-500 p-4">
            <span className="text-white font-semibold">Increased Disease Risk (PRS &gt;80%)</span>
            <span className="text-orange-400 text-xl font-bold">2</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border-l-4 border-emerald-500 p-4">
            <span className="text-white font-semibold">Protective Variants</span>
            <span className="text-emerald-400 text-xl font-bold">3</span>
          </div>
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
