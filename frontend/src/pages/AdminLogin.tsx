import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'

function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string } } }
  return e?.response?.data?.error || fallback
}

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaQuestion, setCaptchaQuestion] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const navigate = useNavigate()

  const refreshCaptcha = useCallback(async () => {
    try {
      const res = await authAPI.getCaptcha()
      setCaptchaQuestion(res.data.question)
      setCaptchaToken(res.data.captcha_token)
      setCaptchaAnswer('')
    } catch {
      setCaptchaQuestion('')
      setCaptchaToken('')
    }
  }, [])

  useEffect(() => {
    refreshCaptcha()
  }, [refreshCaptcha])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await authAPI.adminLogin(username, password, captchaToken, captchaAnswer)
      sessionStorage.setItem('token', res.data.access_token)
      sessionStorage.setItem('user', JSON.stringify(res.data.user))
      navigate('/admin')
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'))
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left panel -- illustration + greeting, same style as the main login page */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-teal-50 via-emerald-50 to-white">
        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-teal-100/70" />
        <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-emerald-100/80 to-transparent" />
        <div className="absolute top-10 right-10 w-6 h-6 rounded-full border-4 border-amber-200" />
        <div className="absolute bottom-24 right-16 w-4 h-4 rounded-full border-4 border-teal-200" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <h1 className="text-5xl font-extrabold text-slate-800 mb-3">
            Hello<span className="text-teal-500">!</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-xs">
            Administrator access to MedDiagnose AI. Please sign in to continue.
          </p>
        </div>

        {/* Original simple flat illustration -- friendly admin/shield motif */}
        <svg
          className="absolute bottom-0 right-0 w-[70%] max-w-md"
          viewBox="0 0 400 420"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="230" cy="390" rx="140" ry="26" fill="#0f766e" opacity="0.08" />
          {/* coat body */}
          <path d="M120 420 L120 250 Q120 190 200 190 Q280 190 280 250 L280 420 Z" fill="#ffffff" stroke="#0d9488" strokeWidth="4" />
          {/* collar */}
          <path d="M175 200 L200 240 L225 200" fill="none" stroke="#0d9488" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="188" y="205" width="24" height="60" fill="#0f766e" />
          {/* head */}
          <circle cx="200" cy="140" r="55" fill="#fcd9b8" />
          {/* hair */}
          <path d="M148 130 Q150 80 200 80 Q250 80 252 130 Q252 100 200 100 Q148 100 148 130 Z" fill="#3f2d20" />
          {/* smile */}
          <path d="M180 158 Q200 172 220 158" fill="none" stroke="#7c4a2d" strokeWidth="3" strokeLinecap="round" />
          <circle cx="178" cy="138" r="4" fill="#3f2d20" />
          <circle cx="222" cy="138" r="4" fill="#3f2d20" />
          {/* shield badge on chest -- admin accent instead of stethoscope */}
          <path d="M200 225 L218 232 L218 252 Q218 268 200 278 Q182 268 182 252 L182 232 Z" fill="#0d9488" />
          <path d="M193 250 L198 256 L209 242" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {/* clipboard in hand */}
          <rect x="270" y="240" width="46" height="60" rx="4" fill="#ffffff" stroke="#0d9488" strokeWidth="3" />
          <rect x="280" y="232" width="26" height="10" rx="2" fill="#0d9488" />
          <line x1="280" y1="258" x2="306" y2="258" stroke="#99f6e4" strokeWidth="3" />
          <line x1="280" y1="270" x2="306" y2="270" stroke="#99f6e4" strokeWidth="3" />
          <line x1="280" y1="282" x2="298" y2="282" stroke="#99f6e4" strokeWidth="3" />
        </svg>
      </div>

      {/* Right panel -- form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-sm font-semibold text-teal-600 tracking-wide uppercase mb-1">MedDiagnose</p>
            <h2 className="text-2xl font-bold text-slate-900">Admin Sign In</h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Enter admin username"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-11 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Security check</label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center justify-center bg-slate-100 border border-slate-300 rounded-lg font-mono text-lg tracking-wider text-slate-800 select-none">
                  {captchaQuestion || '...'}
                </div>
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="px-3 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50"
                  title="Refresh captcha"
                >
                  ↻
                </button>
              </div>
              <input
                type="text"
                required
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                className="mt-2 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Your answer"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-teal-500 text-white py-2.5 px-4 rounded-lg font-medium hover:opacity-95 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Signing in…' : 'Sign in to Admin Portal'}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link to="/login" className="text-teal-700 hover:text-teal-900 text-sm font-medium">
              ← Back to regular login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}