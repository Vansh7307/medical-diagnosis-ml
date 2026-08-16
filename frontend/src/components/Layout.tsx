import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'

interface NavItem {
  path: string
  label: string
  icon: string
  badge?: number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const staffNavGroups: NavGroup[] = [
  {
    title: 'CLINICAL WORKSPACE',
    items: [
      { path: '/', label: 'Diagnostics & Intake', icon: '🔬' },
      { path: '/diagnosis/new', label: 'Laboratory & Blood Panels', icon: '🧪' },
      { path: '/radiology', label: 'Scans & Radiology', icon: '🩻' },
      { path: '/cardiology', label: 'Cardiology & Signals', icon: '🫀' },
    ],
  },
  {
    title: 'SPECIALIZED TEST SUITES',
    items: [
      { path: '/genomics', label: 'Genomics & DNA', icon: '🧬' },
      { path: '/pathology', label: 'Pathology & Microbiology', icon: '🦠' },
      { path: '/oncology', label: 'Oncology Biomarkers', icon: '🎗️' },
      { path: '/neurology', label: 'Neurology & Mental Health', icon: '🧠' },
    ],
  },
  {
    title: 'CLINICAL INTELLIGENCE',
    items: [
      { path: '/reports', label: 'Diagnostic Reports', icon: '📄' },
      { path: '/analytics', label: 'Patient Longitudinal Trends', icon: '📈' },
      { path: '/mlops', label: 'System Telemetry & Model XAI', icon: '⚡' },
      { path: '/settings', label: 'Settings & Compliance', icon: '⚙️' },
    ],
  },
]

const patientNavGroups: NavGroup[] = [
  {
    title: 'HEALTH',
    items: [
      { path: '/', label: 'Dashboard', icon: '📊' },
      { path: '/my-profile', label: 'My Profile', icon: '🪪' },
      { path: '/diagnosis/history', label: 'My Reports', icon: '📋' },
    ],
  },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  let user: { role?: string; full_name?: string; username?: string } = {}
  try {
    user = JSON.parse(sessionStorage.getItem('user') || '{}')
  } catch {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
  }

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    navigate('/login')
  }

  const navGroups = user.role === 'patient' ? patientNavGroups : staffNavGroups
  const adminGroup: NavGroup = {
    title: 'ADMIN',
    items: [{ path: '/admin', label: 'Admin Portal', icon: '🛡️' }],
  }

  const allGroups = user.role === 'admin' ? [...navGroups, adminGroup] : navGroups

  const sidebarContent = (
    <>
      {/* Branding */}
      <div className="sticky top-0 z-10 px-4 py-4 border-b border-white/5 bg-[#060709]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center font-bold text-sm text-slate-900 shrink-0">
            Ω
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white leading-tight">MedAI Omni</h1>
            <p className="text-[10px] text-cyan-300/70 leading-tight">Medical Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {allGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <div className="px-3 py-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{group.title}</p>
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/10 text-cyan-300 font-medium shadow-lg shadow-cyan-500/20 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-lg ${isActive ? 'scale-110' : 'group-hover:scale-105'} transition-transform`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-xs font-semibold text-red-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="border-t border-white/5 p-4 space-y-3">
        <div className="px-2 py-2 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center font-bold text-xs text-slate-900 shrink-0">
              V
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {user.full_name || user.username || 'User'}
              </p>
              <p className="text-[10px] text-cyan-300/60 truncate">
                {user.role === 'patient' ? 'Patient' : user.role === 'admin' ? 'Administrator' : 'Clinician'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="app-shell flex h-screen overflow-hidden bg-[#060709]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-gradient-to-b from-[#0D1117] to-[#0A0E14] text-white flex-col shrink-0 border-r border-white/5">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[85%] bg-gradient-to-b from-[#0D1117] to-[#0A0E14] text-white flex flex-col h-full shadow-2xl border-r border-white/5">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0D1117]/80 text-white shrink-0 border-b border-white/5 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center font-bold text-xs text-slate-900 shrink-0">
            Ω
          </div>
          <span className="text-sm font-bold">MedAI Omni</span>
        </div>

        {/* Top Status Bar */}
        <div className="hidden md:flex sticky top-0 z-20 border-b border-white/5 bg-[#0D1117]/60 px-6 py-2.5 backdrop-blur-xl items-center justify-between text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-emerald-300">🟢 System Active</span>
            <span className="text-cyan-300">⚡ Inference: Ready</span>
            <span>🔒 HIPAA Protected</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://medical-diagnosis-ml.vercel.app" target="_blank" rel="noreferrer" className="rounded-md border border-cyan-500/40 px-2.5 py-1 text-cyan-300 hover:bg-cyan-500/10 transition-colors">Live Demo</a>
            <a href="https://github.com/Vansh7307/medical-diagnosis-ml" target="_blank" rel="noreferrer" className="rounded-md border border-slate-600 px-2.5 py-1 text-slate-300 hover:border-slate-400 transition-colors">GitHub</a>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
