import { useState, useEffect, useCallback } from 'react'
import { adminAPI } from '../services/api'

interface AdminUser {
  id: number
  username: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  is_email_verified: boolean
  last_login_at: string | null
  login_count: number
  created_at: string
}

interface Stats {
  total_users: number
  verified_users: number
  unverified_users: number
  active_users: number
  inactive_users: number
  by_role: Record<string, number>
  successful_logins: number
  failed_logins: number
}

const ROLES = ['patient', 'clinician', 'doctor', 'admin']

function fmtDate(iso: string | null) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString()
}

function Badge({ ok, onLabel, offLabel }: { ok: boolean; onLabel: string; offLabel: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        ok ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {ok ? onLabel : offLabel}
    </span>
  )
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminAPI.listUsers(page, search, roleFilter)
      setUsers(res.data.users)
      setPages(res.data.pages || 1)
    } catch {
      setError('Failed to load users. You may not have admin access.')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter])

  const loadStats = useCallback(async () => {
    try {
      const res = await adminAPI.stats()
      setStats(res.data)
    } catch {
      // stats are supplementary; ignore failures here
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])
  useEffect(() => { loadStats() }, [loadStats])

  const handleRoleChange = async (user: AdminUser, role: string) => {
    setBusyId(user.id)
    try {
      await adminAPI.updateRole(user.id, role)
      await Promise.all([loadUsers(), loadStats()])
    } catch {
      setError(`Failed to update role for ${user.username}`)
    } finally {
      setBusyId(null)
    }
  }

  const handleStatusToggle = async (user: AdminUser) => {
    setBusyId(user.id)
    try {
      await adminAPI.updateStatus(user.id, !user.is_active)
      await Promise.all([loadUsers(), loadStats()])
    } catch {
      setError(`Failed to update status for ${user.username}`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
        <p className="text-slate-500 text-sm mt-1">
          Every registered and logged-in user, with role and status controls.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Total Users</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total_users}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Verified</p>
            <p className="text-2xl font-bold text-teal-600">{stats.verified_users}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Active</p>
            <p className="text-2xl font-bold text-blue-600">{stats.active_users}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Successful / Failed Logins</p>
            <p className="text-2xl font-bold text-slate-900">
              {stats.successful_logins} <span className="text-red-500 text-lg">/ {stats.failed_logins}</span>
            </p>
          </div>
        </div>
      )}

      <LinkPatientPanel />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value) }}
            placeholder="Search username, email, or name..."
            className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => { setPage(1); setRoleFilter(e.target.value) }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="m-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 font-medium">Logins</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No users found.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{u.full_name || u.username}</p>
                      <p className="text-xs text-slate-500">@{u.username} · {u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        className="border border-slate-300 rounded-lg px-2 py-1 text-xs disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 space-x-1">
                      <Badge ok={u.is_active} onLabel="Active" offLabel="Deactivated" />
                      <Badge ok={u.is_email_verified} onLabel="Verified" offLabel="Unverified" />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(u.last_login_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{u.login_count}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleStatusToggle(u)}
                        disabled={busyId === u.id}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 ${
                          u.is_active
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 flex items-center justify-between border-t border-slate-200 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-slate-500">Page {page} of {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
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
      <h3 className="font-semibold text-slate-900 mb-1">Link Patient Record</h3>
      <p className="text-sm text-slate-500 mb-3">
        Enter a patient's code to connect their login account automatically (matched by the email on file).
        New registrations link automatically already -- this is only needed for older accounts/records.
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