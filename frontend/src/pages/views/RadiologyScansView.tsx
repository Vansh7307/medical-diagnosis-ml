import { useState } from 'react'
import { MetricCard } from '../../components/MetricCard'
import { diagnosisAPI } from '../../services/api'

export default function RadiologyScansView() {
  const [selectedModality, setSelectedModality] = useState('cxr')
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [uploadedDICOM, setUploadedDICOM] = useState<File | null>(null)
  const [analysisType, setAnalysisType] = useState<'lesion' | 'fracture' | 'pathology'>('lesion')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const modalities = [
    { id: 'cxr', name: 'Chest X-Ray', icon: '🫁', description: 'Pneumonia, TB, Cardiomegaly' },
    { id: 'mri', name: 'Brain MRI', icon: '🧠', description: 'Stroke, Tumor, Aneurysm, Lesions' },
    { id: 'ct', name: 'CT Abdomen', icon: '🔍', description: 'Appendicitis, Kidney Stones' },
    { id: 'ultrasound', name: 'Pelvic Ultrasound', icon: '📍', description: 'OB/GYN, Cysts, Masses' },
    { id: 'mammography', name: 'Mammography', icon: '🏥', description: 'Breast Lesions, Microcalc' },
    { id: 'dexa', name: 'DEXA Scan', icon: '🦴', description: 'Bone Density, Osteoporosis' },
  ]

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploadedImage(e.target.files[0])
    }
  }

  const handleDICOMUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploadedDICOM(e.target.files[0])
    }
  }

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      if (uploadedImage) formData.append('image', uploadedImage)
      if (uploadedDICOM) formData.append('dicom', uploadedDICOM)
      formData.append('modality', selectedModality)
      formData.append('analysis_type', analysisType)

      const { data } = await diagnosisAPI.radiology(formData)
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
        <p className="eyebrow">Medical Imaging</p>
        <h1 className="text-3xl font-bold text-white">Radiology & Medical Scans Studio</h1>
        <p className="text-slate-400 mt-2">DICOM viewer, anomaly detection, lesion highlighting, and image-based diagnostics</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Scans Analyzed" value={1247} accent="#22d3ee" />
        <MetricCard label="Anomalies Found" value={84} accent="#f97316" />
        <MetricCard label="Avg Sensitivity" value="96.2%" accent="#34d399" />
        <MetricCard label="Alerts Generated" value={34} accent="#a78bfa" />
      </div>

      {/* Modality Selection Grid */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">📸 Select Imaging Modality</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {modalities.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setSelectedModality(mod.id)}
              className={`p-4 rounded-lg text-center transition-all border-2 ${
                selectedModality === mod.id
                  ? 'border-cyan-500 bg-cyan-500/20'
                  : 'border-white/10 hover:border-cyan-500/50'
              }`}
            >
              <div className="text-3xl mb-2">{mod.icon}</div>
              <p className="font-semibold text-white text-sm">{mod.name}</p>
              <p className="text-xs text-slate-400 mt-1">{mod.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Image & DICOM Upload */}
      <div className="glass-panel p-6 space-y-6">
        <h3 className="text-lg font-bold text-white">📁 Upload Medical Image</h3>

        <div className="space-y-4">
          {/* Standard Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">Standard Image (JPG/PNG)</label>
            <div className="relative flex items-center justify-center rounded-xl border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 p-8 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all cursor-pointer">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleImageUpload}
                accept="image/*"
              />
              <div className="text-center pointer-events-none">
                <div className="text-4xl mb-2">🖼️</div>
                <p className="font-medium text-white">Drag image or click to upload</p>
                {uploadedImage && <p className="text-xs text-cyan-400 mt-2">📄 {uploadedImage.name}</p>}
              </div>
            </div>
          </div>

          {/* DICOM Upload */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">DICOM Medical File (.dcm)</label>
            <div className="relative flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 p-8 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all cursor-pointer">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleDICOMUpload}
                accept=".dcm,.dicom"
              />
              <div className="text-center pointer-events-none">
                <div className="text-4xl mb-2">🏥</div>
                <p className="font-medium text-white">Drag DICOM or click to upload</p>
                {uploadedDICOM && <p className="text-xs text-emerald-400 mt-2">📄 {uploadedDICOM.name}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Type */}
        <div>
          <label className="block text-sm font-semibold text-white mb-3">Analysis Type</label>
          <div className="grid grid-cols-3 gap-2">
            {['lesion', 'fracture', 'pathology'].map((type) => (
              <button
                key={type}
                onClick={() => setAnalysisType(type as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  analysisType === type
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {type === 'lesion'
                  ? '🔴 Lesion Detection'
                  : type === 'fracture'
                    ? '🦴 Fracture'
                    : '🦠 Pathology'}
              </button>
            ))}
          </div>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading || (!uploadedImage && !uploadedDICOM)}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Analyzing Scan...' : 'Run Anomaly Detection'}
        </button>
      </div>

      {/* Image Viewer Canvas Simulation */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">📺 Image Viewer & Lesion Overlay</h3>
        <div className="relative w-full h-96 rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center overflow-hidden group">
          {/* Simulated scan display */}
          <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-cyan-500 via-slate-500 to-emerald-500" />

          {/* Bounding boxes for anomalies */}
          <div className="absolute top-12 left-16 w-32 h-24 border-2 border-red-500 rounded-lg opacity-70" />
          <div className="absolute top-32 right-12 w-20 h-20 border-2 border-orange-500 rounded-full opacity-70" />

          <div className="relative text-center pointer-events-none">
            <div className="text-5xl mb-3">🖼️</div>
            <p className="text-slate-300 font-medium">Medical Image Viewer</p>
            <p className="text-xs text-slate-500 mt-1">Bounding boxes show detected anomalies</p>
            <p className="text-xs text-red-400 mt-2">🔴 Suspected Lesion (High Confidence)</p>
            <p className="text-xs text-orange-400">🟠 Possible Fracture (Medium Confidence)</p>
          </div>

          {/* Layer Toggles */}
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="px-2 py-1 text-xs rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30">
              X-Ray Layer
            </button>
            <button className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30">
              Heatmap
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      {results && (
        <div className="glass-panel p-6 border-l-4 border-cyan-500 space-y-4">
          <h3 className="text-lg font-bold text-white">🔍 Anomaly Detection Results</h3>
          <div className="space-y-3">
            <div className="rounded-lg bg-red-500/10 border-l-4 border-red-500 p-4">
              <p className="font-semibold text-red-300">🔴 HIGH CONFIDENCE LESION DETECTED</p>
              <p className="text-sm text-slate-300 mt-1">Location: Upper right lobe | Confidence: 94% | Size: 2.3cm</p>
            </div>
            <div className="rounded-lg bg-orange-500/10 border-l-4 border-orange-500 p-4">
              <p className="font-semibold text-orange-300">🟠 POSSIBLE OPACITY</p>
              <p className="text-sm text-slate-300 mt-1">Location: Lower left quadrant | Confidence: 62% | Requires clinical correlation</p>
            </div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg">
            <pre className="text-xs text-slate-300 overflow-auto max-h-40">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
