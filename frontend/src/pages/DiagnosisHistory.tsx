import { useState, useEffect, useCallback } from 'react'
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

interface PatientOption {
  id: number
  patient_id: string
  first_name: string
  last_name: string
}

export default function DiagnosisHistory() {
  const { patientId } = useParams()

  let currentUser: { role?: string } = {}
  try {
    currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    // ignore corrupted value here -- Layout/App already guard against it globally
  }

  if (currentUser.role === 'patient') {
    return <MyDiagnosisHistory />
  }

  return <StaffDiagnosisHistory initialPatientId={patientId} />
}

/** Patient-role view: no search needed, just show their own history. */
function MyDiagnosisHistory() {
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([])
  const [patientInfo, setPatientInfo] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    diagnosisAPI.myHistory()
      .then(res => {
        setDiagnoses(res.data.diagnoses || [])
        setPatientInfo(res.data.patient || null)
      })
      .catch((err) => {
        setMessage(err.response?.data?.message || 'Unable to load your history right now.')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">My Diagnosis History</h2>

      {patientInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900">{String(patientInfo.first_name)} {String(patientInfo.last_name)}</h3>
          <p className="text-sm text-blue-700">Patient Code: {String(patientInfo.patient_id)}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : message ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-900 text-sm">{message}</div>
      ) : diagnoses.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
          No reports yet.
        </div>
      ) : (
        <DiagnosisList diagnoses={diagnoses} />
      )}
    </div>
  )
}

/** Staff view: existing name/ID search picker, unchanged behavior. */
function StaffDiagnosisHistory({ initialPatientId }: { initialPatientId?: string }) {
  const patientId = initialPatientId
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || '')
  const [diagnoses, setDiagnoses] = useState<DiagnosisRecord[]>([])
  const [patientInfo, setPatientInfo] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Patient picker state -- lets you search by name / human-readable ID
  // instead of guessing the internal numeric database id.
  const [patientSearch, setPatientSearch] = useState('')
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerLoading, setPickerLoading] = useState(false)

  const searchPatients = useCallback((term: string) => {
    setPickerLoading(true)
    patientsAPI.list(1, term)
      .then((res) => setPatientOptions(res.data.patients || []))
      .catch(() => setPatientOptions([]))
      .finally(() => setPickerLoading(false))
  }, [])

  useEffect(() => {
    if (!pickerOpen) return
    const t = setTimeout(() => searchPatients(patientSearch), 250)
    return () => clearTimeout(t)
  }, [patientSearch, pickerOpen, searchPatients])

  const loadHistory = useCallback((idToLoad?: string) => {
    const id = idToLoad ?? selectedPatientId
    if (!id) return
    setLoading(true)
    setError('')
    diagnosisAPI.history(parseInt(id))
      .then(res => {
        setDiagnoses(res.data.diagnoses)
        setPatientInfo(res.data.patient)
      })
      .catch((err) => {
        setDiagnoses([])
        setPatientInfo(null)
        const status = err?.response?.status
        if (status === 404) {
          setError(`No patient found with ID ${id}.`)
        } else if (status === 401) {
          setError('Your session has expired. Please log in again.')
        } else if (status === 403) {
          setError("You don't have permission to view this. Ask an admin to update your role.")
        } else {
          setError(err?.response?.data?.error || 'Failed to load diagnosis history. Is the backend running?')
        }
      })
      .finally(() => setLoading(false))
  }, [selectedPatientId])

  useEffect(() => {
    if (selectedPatientId) loadHistory(selectedPatientId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectPatient = (p: PatientOption) => {
    setSelectedPatientId(String(p.id))
    setPickerOpen(false)
    setPatientSearch(`${p.first_name} ${p.last_name} (${p.patient_id})`)
    loadHistory(String(p.id))
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Diagnosis History</h2>

      <div className="mb-6 relative max-w-md">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Search patient by name or Patient ID
        </label>
        <input
          type="text"
          value={patientSearch}
          onFocus={() => { setPickerOpen(true); searchPatients(patientSearch) }}
          onChange={(e) => { setPatientSearch(e.target.value); setPickerOpen(true) }}
          placeholder="Start typing a patient's name or ID..."
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {pickerOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {pickerLoading ? (
              <div className="p-3 text-sm text-slate-400">Searching...</div>
            ) : patientOptions.length === 0 ? (
              <div className="p-3 text-sm text-slate-400">
                No patients found. Add one on the Patients page first.
              </div>
            ) : (
              patientOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPatient(p)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex justify-between items-center"
                >
                  <span className="font-medium text-slate-800">{p.first_name} {p.last_name}</span>
                  <span className="text-xs font-mono text-slate-500">{p.patient_id}</span>
                </button>
              ))
            )}
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="w-full text-center px-4 py-1.5 text-xs text-slate-400 hover:bg-slate-50 border-t"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {patientInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900">{String(patientInfo.first_name)} {String(patientInfo.last_name)}</h3>
          <p className="text-sm text-blue-700">ID: {String(patientInfo.patient_id)} | Gender: {String(patientInfo.gender)} | Blood Type: {String(patientInfo.blood_type || 'N/A')}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : error ? null : diagnoses.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
          {selectedPatientId ? 'No diagnosis records found for this patient.' : 'Search for a patient above to view their diagnosis history.'}
        </div>
      ) : (
        <DiagnosisList diagnoses={diagnoses} />
      )}
    </div>
  )
}

function DiagnosisList({ diagnoses }: { diagnoses: DiagnosisRecord[] }) {
  return (
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
  )
}