import { useState } from 'react'
import { MetricCard } from '../../components/MetricCard'
import { reportsAPI } from '../../services/api'

export default function DiagnosticReportsView() {
  const [reportFormat, setReportFormat] = useState<'pdf' | 'print'>('pdf')
  const [includeImages, setIncludeImages] = useState(true)
  const [includeBiomarkers, setIncludeBiomarkers] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [patientId, setPatientId] = useState('')
  const [exportError, setExportError] = useState('')

  const handleExport = async () => {
    setGenerating(true)
    setExportError('')
    try {
      if (!patientId.trim()) {
        setExportError('Enter a patient ID before generating a report.')
        return
      }
      const { data } = await reportsAPI.generate(patientId.trim())
      const blob = new Blob([JSON.stringify({ ...data, format: reportFormat, includeImages, includeBiomarkers }, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clinical_report_${patientId}_${new Date().toISOString()}.json`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      setExportError('The report could not be generated. Confirm the patient ID and try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <p className="eyebrow">Clinical Documentation</p>
        <h1 className="text-3xl font-bold text-white">Diagnostic Reports & Clinical Summary</h1>
        <p className="text-slate-400 mt-2">1-Click PDF/Print export of comprehensive clinical summaries with patient data, diagnosis, confidence scores, and recommendations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Reports Generated" value={8432} accent="#22d3ee" />
        <MetricCard label="Total Pages" value="47,821" accent="#34d399" />
        <MetricCard label="Avg Report Time" value="2.3 min" accent="#f97316" />
        <MetricCard label="Export Success" value="99.8%" accent="#a78bfa" />
      </div>

      {/* Report Preview */}
      <div className="glass-panel p-8 space-y-6">
        <h3 className="text-lg font-bold text-white">📄 Clinical Summary Document</h3>

        <div className="bg-white text-slate-900 p-8 rounded-lg space-y-4 font-serif">
          <div className="border-b border-slate-300 pb-4">
            <h1 className="text-2xl font-bold">CLINICAL DIAGNOSTIC REPORT</h1>
            <p className="text-sm text-slate-600 mt-1">Medical Diagnosis Intelligence Platform</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-slate-500 font-semibold">PATIENT INFORMATION</p>
              <p className="font-semibold mt-1">John Michael Doe</p>
              <p className="text-sm text-slate-600">DOB: 01/15/1965 | Age: 59M</p>
              <p className="text-sm text-slate-600">MRN: 123456789</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold">REPORT DETAILS</p>
              <p className="font-semibold mt-1">Report Date: August 16, 2026</p>
              <p className="text-sm text-slate-600">Clinician: Dr. Sarah Chen, MD</p>
              <p className="text-sm text-slate-600">Institution: Memorial Medical Center</p>
            </div>
          </div>

          <div className="border-t border-b border-slate-300 py-4">
            <p className="text-xs text-slate-500 font-semibold">CLINICAL IMPRESSION</p>
            <p className="mt-2">Patient presents with chest pain, shortness of breath, and elevated cardiac biomarkers. ECG analysis reveals QTc prolongation (468ms) and nonspecific ST-wave changes. Troponin-I elevated at 0.08 ng/mL. Clinical correlation suggests acute coronary syndrome with moderate-to-high risk profile.</p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 font-semibold">DIAGNOSTIC FINDINGS</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• 12-Lead ECG: ST-segment elevation in leads II, III, aVF (Inferior MI pattern)</li>
                <li>• Troponin-I: 0.08 ng/mL (HIGH, reference &lt;0.04)</li>
                <li>• High-sensitivity CRP: 8.2 mg/L (ELEVATED)</li>
                <li>• BNP: 450 pg/mL (ELEVATED, indicating heart failure risk)</li>
              </ul>
            </div>
          </div>

          <div className="bg-red-50 border border-red-300 rounded p-3">
            <p className="text-xs text-red-700 font-semibold">⚠️ CLINICAL ALERTS</p>
            <p className="text-sm text-red-700 mt-1">CRITICAL: Recommend immediate cardiology consultation and possible cardiac catheterization</p>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-semibold">RECOMMENDATIONS</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>1. Urgent cardiology evaluation (same-day)</li>
              <li>2. Serial troponin measurements (every 3 hours)</li>
              <li>3. Continuous cardiac monitoring</li>
              <li>4. Consider dual-antiplatelet therapy</li>
              <li>5. Beta-blocker and ACE-inhibitor initiation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="glass-panel p-6 space-y-6">
        <h3 className="text-lg font-bold text-white">⚙️ Export Settings</h3>

        <div>
          <label className="text-sm font-semibold text-white mb-3 block">Report Format</label>
          <div className="flex gap-2">
            {[
              { id: 'pdf', label: '📄 PDF' },
              { id: 'print', label: '🖨️ Print' },
            ].map((format) => (
              <button
                key={format.id}
                onClick={() => setReportFormat(format.id as any)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  reportFormat === format.id
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {format.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="report-patient-id" className="text-sm font-semibold text-white mb-2 block">Patient ID</label>
          <input id="report-patient-id" value={patientId} onChange={(event) => setPatientId(event.target.value)} placeholder="PAT-12345678 or internal ID" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none" />
        </div>

        {exportError && <p role="alert" className="text-sm text-rose-300">{exportError}</p>}

        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-colors">
            <input
              type="checkbox"
              checked={includeImages}
              onChange={(e) => setIncludeImages(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-300">Include Medical Images & Scan Overlays</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-colors">
            <input
              type="checkbox"
              checked={includeBiomarkers}
              onChange={(e) => setIncludeBiomarkers(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-300">Include Biomarker Trend Charts</span>
          </label>
        </div>

        <button
          onClick={handleExport}
          disabled={generating}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
        >
          <span>💾</span>
          {generating ? 'Generating Report...' : 'Export Clinical Summary'}
        </button>
      </div>

      {/* Recently Generated Reports */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4">📋 Recent Reports</h3>
        <div className="space-y-2">
          {[
            { patient: 'John Doe', date: '2026-08-16', type: 'PDF', pages: 12 },
            { patient: 'Jane Smith', date: '2026-08-15', type: 'PDF', pages: 8 },
            { patient: 'Robert Johnson', date: '2026-08-15', type: 'Print', pages: 15 },
          ].map((report) => (
            <div key={report.patient} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div>
                <p className="text-sm font-semibold text-white">{report.patient}</p>
                <p className="text-xs text-slate-400">{report.date} • {report.pages} pages</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">{report.type}</span>
                <button className="px-3 py-1 text-xs rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">Download</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
