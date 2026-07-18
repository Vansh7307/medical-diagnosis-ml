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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 px-4">
      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-950 px-8 pt-8 pb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <span className="text-3xl leading-none">🛡️</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
            <p className="text-slate-300/90 mt-1 text-sm">MedDiagnose AI — Administrator Access</p>
          </div>

          <div className="p-8">
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
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="Enter admin username"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
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
                  className="mt-2 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="Answer"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-800 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Signing in…' : 'Sign in to Admin Portal'}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link to="/login" className="text-slate-500 hover:text-slate-700 text-sm">
                ← Back to regular login
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-4">
          Restricted access. All sign-in attempts are logged.
        </p>
      </div>
    </div>
  )
}