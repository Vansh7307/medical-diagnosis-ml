import { useState, useEffect } from 'react'
import { patientsAPI } from '../services/api'

export default function MyProfile() {
  const [loading, setLoading] = useState(true)
  const [linked, setLinked] = useState(false)
  const [patient, setPatient] = useState<Record<string, unknown> | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    patientsAPI.me()
      .then(res => {
        setLinked(true)
        setPatient(res.data.patient)
      })
      .catch(err => {
        setLinked(false)
        setMessage(err.response?.data?.message || 'No patient record is linked to your account yet.')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  }

  if (!linked || !patient) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">My Profile</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-900 max-w-xl">
          {message}
        </div>
      </div>
    )
  }

  const field = (label: string, value: unknown) => (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-slate-900 mt-0.5">{(value as string) || '—'}</p>
    </div>
  )

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-1">My Profile</h2>
      <p className="text-slate-500 mb-6">
        Patient Code: <span className="font-mono font-medium">{patient.patient_id as string}</span>
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {field('First Name', patient.first_name)}
        {field('Last Name', patient.last_name)}
        {field('Date of Birth', patient.date_of_birth)}
        {field('Gender', patient.gender)}
        {field('Email', patient.email)}
        {field('Phone', patient.phone)}
        {field('Blood Type', patient.blood_type)}
        {field('Address', patient.address)}
        {field('Emergency Contact', patient.emergency_contact_name)}
        {field('Emergency Contact Phone', patient.emergency_contact_phone)}
      </div>

      {(patient.medical_history || patient.allergies) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6 space-y-4">
          {patient.medical_history ? (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Medical History</p>
              <p className="text-slate-700 text-sm whitespace-pre-wrap">{patient.medical_history as string}</p>
            </div>
          ) : null}
          {patient.allergies ? (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Allergies</p>
              <p className="text-slate-700 text-sm whitespace-pre-wrap">{patient.allergies as string}</p>
            </div>
          ) : null}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-4">
        To update any of these details, please contact your clinic directly.
      </p>
    </div>
  )
}