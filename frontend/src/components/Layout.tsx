import { useState } from 'react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center font-bold text-sm shrink-0">
          M
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold leading-tight">MedDiagnose AI</h1>
          <p className="text-[11px] text-slate-400 leading-tight">Machine Learning Platform</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 mt-2 overflow-y-auto">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              location.pathname === item.path
                ? 'bg-teal-500/15 text-teal-300 font-medium ring-1 ring-teal-500/30'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.full_name || user.username}</p>
            <p className="text-[11px] text-slate-400 capitalize">{user.role || 'Clinician'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 shrink-0"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar -- always visible, static width */}
      <aside className="hidden lg:flex w-64 bg-[#0b1220] text-white flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar -- off-canvas drawer, only rendered/shown when opened */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[80%] bg-[#0b1220] text-white flex flex-col h-full shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar with hamburger -- hidden on desktop */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0b1220] text-white shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-xs shrink-0">M</div>
          <span className="text-sm font-semibold">MedDiagnose AI</span>
        </div>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}