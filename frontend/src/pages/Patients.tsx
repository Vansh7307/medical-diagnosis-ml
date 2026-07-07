import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { patientsAPI } from '../services/api'

interface Patient {
  id: number
  patient_id: string
  first_name: string
  last_name: string
  gender: string
  email: string
  phone: string
  blood_type: string
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
          setError("You don't have permission to view patients. This requires a doctor, clinician, or admin role — ask an admin to update your role in the Admin Portal.")
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
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Patients</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
          {showForm ? 'Cancel' : '+ Add Patient'}
        </button>
      </div>

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
                  <td className="py-3 px-4 font-mono text-xs">{p.patient_id}</td>
                  <td className="py-3 px-4">{p.first_name} {p.last_name}</td>
                  <td className="py-3 px-4">{p.gender}</td>
                  <td className="py-3 px-4">{p.email || '-'}</td>
                  <td className="py-3 px-4">{p.blood_type || '-'}</td>
                  <td className="py-3 px-4 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 space-x-3">
                    <Link to={`/diagnosis/history/${p.id}`} className="text-blue-600 hover:text-blue-800 text-xs">History</Link>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </div>
  )
}
