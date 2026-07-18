import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'

const staffNavItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/patients', label: 'Patients', icon: '👥' },
  { path: '/diagnosis/new', label: 'New Diagnosis', icon: '🔬' },
  { path: '/diagnosis/history', label: 'History', icon: '📋' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
  { path: '/mlops', label: 'MLOps', icon: '⚙️' },
]

const patientNavItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/my-profile', label: 'My Profile', icon: '🪪' },
  { path: '/diagnosis/new', label: 'New Diagnosis', icon: '🔬' },
  { path: '/diagnosis/history', label: 'My History', icon: '📋' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  let user: { role?: string } = {}
  try {
    user = JSON.parse(sessionStorage.getItem('user') || '{}')
  } catch {
    // Corrupted sessionStorage value -- clear it and fall back to a logged-out state
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
  }

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    navigate('/login')
  }

  const baseItems = user.role === 'patient' ? patientNavItems : staffNavItems
  const items = user.role === 'admin'
    ? [...baseItems, { path: '/admin', label: 'Admin Portal', icon: '🛡️' }]
    : baseItems

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-lg font-bold">MedDiagnose AI</h1>
          <p className="text-xs text-slate-400 mt-1">Machine Learning Platform</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user.full_name || user.username}</p>
              <p className="text-xs text-slate-400">{user.role || 'Clinician'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}