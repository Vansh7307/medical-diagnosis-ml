import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { diagnosisAPI, patientsAPI } from '../services/api'

interface DiagnosisRecord {
  id: number
  diagnosis_type: string
  prediction: string
  confidence: number
  risk_score: number | null
  model_name: string
  model_version: string
  created_at: string
  status: string
}

export default function DiagnosisHistory() {
  const { patientId } = useParams()
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || '')
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([])
  const [patientInfo, setPatientInfo] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  const loadHistory = () => {
    if (!selectedPatientId) return
    setLoading(true)
    diagnosisAPI.history(parseInt(selectedPatientId))
      .then(res => {
        setDiagnoses(res.data.diagnoses)
        setPatientInfo(res.data.patient)
      })
      .catch(() => { setDiagnoses([]); setPatientInfo(null) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadHistory() }, [selectedPatientId])

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Diagnosis History</h2>

      <div className="mb-6 flex gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Patient ID</label>
          <input
            type="number"
            value={selectedPatientId}
            onChange={e => setSelectedPatientId(e.target.value)}
            placeholder="Enter patient ID"
            className="px-3 py-2 border rounded-lg text-sm w-48"
          />
        </div>
        <button onClick={loadHistory} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          Load History
        </button>
      </div>

      {patientInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900">{String(patientInfo.first_name)} {String(patientInfo.last_name)}</h3>
          <p className="text-sm text-blue-700">ID: {String(patientInfo.patient_id)} | Gender: {String(patientInfo.gender)} | Blood Type: {String(patientInfo.blood_type || 'N/A')}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : diagnoses.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
          {selectedPatientId ? 'No diagnosis records found for this patient.' : 'Enter a patient ID to view diagnosis history.'}
        </div>
      ) : (
        <div className="space-y-3">
          {diagnoses.map(d => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  d.diagnosis_type === 'heart' ? 'bg-red-500' :
                  d.diagnosis_type === 'diabetes' ? 'bg-amber-500' :
                  d.diagnosis_type === 'cancer' ? 'bg-purple-500' : 'bg-blue-500'
                }`} />
                <div>
                  <p className="font-medium text-slate-900 capitalize">{d.diagnosis_type} Diagnosis</p>
                  <p className="text-sm text-slate-500">{d.prediction}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-slate-900">{(d.confidence * 100).toFixed(1)}%</p>
                  <p className="text-xs text-slate-500">Confidence</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-900">{d.risk_score ? `${d.risk_score.toFixed(1)}%` : '-'}</p>
                  <p className="text-xs text-slate-500">Risk</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-mono text-slate-600">{d.model_version}</p>
                  <p className="text-xs text-slate-500">Version</p>
                </div>
                <div className="text-right text-slate-500 text-xs">
                  {new Date(d.created_at).toLocaleDateString()}<br />
                  {new Date(d.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
