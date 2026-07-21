import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { patientsAPI, adminAPI } from '../services/api'
import { MetricCard } from '../components/MetricCard'

interface Patient {
  id: number
  patient_id: string
  first_name: string
  last_name: string
  gender: string
  email: string
  phone: string
  address?: string
  blood_type: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  user_id?: number | null
  created_at: string
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', gender: 'Male', email: '', phone: '', blood_type: '', date_of_birth: '' })

  const loadPatients = () => {
    setLoading(true)
    setError('')
    patientsAPI.list(page, search)
      .then(res => {
        setPatients(res.data.patients)
        setTotal(res.data.total)
      })
      .catch((err) => {
        const status = err?.response?.status
        if (status === 403) {
          setError("This page is for clinic staff only. If you're a patient looking for your own records, visit My Profile or My History in the sidebar instead.")
        } else if (status === 401) {
          setError('Your session has expired. Please log in again.')
        } else {
          setError(err?.response?.data?.error || 'Failed to load patients. Is the backend running?')
        }
        setPatients([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadPatients() }, [page, search])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await patientsAPI.create(form)
      setShowForm(false)
      setForm({ first_name: '', last_name: '', gender: 'Male', email: '', phone: '', blood_type: '', date_of_birth: '' })
      loadPatients()
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to create patient')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this patient?')) return
    try {
      await patientsAPI.delete(id)
      loadPatients()
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete patient')
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard label="Total Patients" value={total} accent="#0d9488" />
        <MetricCard label="Linked Accounts (this page)" value={patients.filter(p => p.user_id).length} accent="#3b82f6" />
        <MetricCard label="Showing" value={patients.length} accent="#8b5cf6" />
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Patients</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowLinkForm(!showLinkForm)} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 text-sm">
            {showLinkForm ? 'Cancel' : '🔗 Link Patient Account'}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            {showForm ? 'Cancel' : '+ Add Patient'}
          </button>
        </div>
      </div>

      {showLinkForm && <LinkPatientPanel />}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
            <input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
            <input required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
            <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Blood Type</label>
            <select value={form.blood_type} onChange={e => setForm({...form, blood_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Select</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => <option key={bt}>{bt}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
            <input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="md:col-span-3">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm">Create Patient</button>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          placeholder="Search patients by name, ID, or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full md:w-96 px-4 py-2 border rounded-lg text-sm"
        />
      </div>

      {/* Table */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No patients found.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Patient ID</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Gender</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Email</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Blood Type</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Created</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">{p.patient_id}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{p.first_name} {p.last_name}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{p.gender}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{p.email || '-'}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{p.blood_type || '-'}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => setEditingPatient(p)} className="text-teal-600 hover:text-teal-800 text-xs">Edit</button>
                    <Link to={`/diagnosis/history/${p.id}`} className="text-blue-600 hover:text-blue-800 text-xs">History</Link>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Prev</button>
          <span className="px-3 py-1 text-sm text-slate-600">Page {page}</span>
          <button onClick={() => setPage(page + 1)} disabled={patients.length < 20} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
        </div>
      )}

      {editingPatient && (
        <EditPatientModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSaved={() => { setEditingPatient(null); loadPatients() }}
        />
      )}
    </div>
  )
}

function EditPatientModal({ patient, onClose, onSaved }: { patient: Patient; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    first_name: patient.first_name || '',
    last_name: patient.last_name || '',
    gender: patient.gender || 'Male',
    email: patient.email || '',
    phone: patient.phone || '',
    address: patient.address || '',
    blood_type: patient.blood_type || '',
    emergency_contact_name: patient.emergency_contact_name || '',
    emergency_contact_phone: patient.emergency_contact_phone || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await patientsAPI.update(patient.id, form)
      onSaved()
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Edit Patient</h3>
            <p className="text-xs font-mono text-slate-500">{patient.patient_id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Blood Type</label>
              <input value={form.blood_type} onChange={e => setForm({ ...form, blood_type: e.target.value })} placeholder="e.g. O+" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street, city, state, zip" className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Name</label>
              <input value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Number</label>
              <input value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LinkPatientPanel() {
  const [patientCode, setPatientCode] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    setBusy(true)
    try {
      const res = await adminAPI.linkPatient(patientCode.trim())
      setStatus({ type: 'success', text: res.data.message })
      setPatientCode('')
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } }
      setStatus({ type: 'error', text: e.response?.data?.error || 'Failed to link account.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <h3 className="font-semibold text-slate-900 mb-1">Link Patient Account</h3>
      <p className="text-sm text-slate-500 mb-3">
        Enter a patient's code to connect their login account automatically (matched by the email on file).
        New registrations already link automatically -- this is only needed for older accounts/records.
      </p>
      <form onSubmit={handleLink} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Patient Code</label>
          <input
            type="text"
            required
            value={patientCode}
            onChange={(e) => setPatientCode(e.target.value)}
            placeholder="e.g. PAT-AFD9477D"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-56 font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Linking…' : 'Link'}
        </button>
      </form>
      {status && (
        <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {status.text}
        </div>
      )}
    </div>
  )
}