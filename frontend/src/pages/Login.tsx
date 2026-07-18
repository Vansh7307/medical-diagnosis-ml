import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

type Mode = 'login' | 'register' | 'verify-otp' | 'forgot-password' | 'reset-password'
type UserTab = 'doctor' | 'clinician' | 'patient-existing' | 'patient-new'

interface FormState {
  username: string
  email: string
  password: string
  full_name: string
  captcha_answer: string
}

const EMPTY_FORM: FormState = { username: '', email: '', password: '', full_name: '', captcha_answer: '' }

function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string; details?: unknown } } }
  const detail = e?.response?.data?.error
  if (detail) return detail
  return fallback
}

export default function Login() {
  const [tab, setTab] = useState<UserTab>('patient-existing')
  const [mode, setMode] = useState<Mode>('login')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [otpCode, setOtpCode] = useState('')
  const [resetOtpCode, setResetOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [showPassword, setShowPassword] = useState(false)

  const [captchaQuestion, setCaptchaQuestion] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')

  const navigate = useNavigate()

  const refreshCaptcha = useCallback(async () => {
    try {
      const res = await authAPI.getCaptcha()
      setCaptchaQuestion(res.data.question)
      setCaptchaToken(res.data.captcha_token)
      setForm((f) => ({ ...f, captcha_answer: '' }))
    } catch {
      setCaptchaQuestion('')
      setCaptchaToken('')
    }
  }, [])

  useEffect(() => {
    if (mode === 'login' || mode === 'register' || mode === 'forgot-password') {
      refreshCaptcha()
    }
  }, [mode, refreshCaptcha])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // Switching tabs picks the right underlying form: the first three tabs all
  // use the same universal login (the account's real role always comes from
  // the backend regardless of which tab was clicked) -- only "New Patient"
  // actually switches to the registration form.
  const handleTabChange = (next: UserTab) => {
    setTab(next)
    setError('')
    setNotice('')
    setForm(EMPTY_FORM)
    setMode(next === 'patient-new' ? 'register' : 'login')
  }

  const finishLogin = (accessToken: string, user: unknown) => {
    localStorage.setItem('token', accessToken)
    localStorage.setItem('user', JSON.stringify(user))
    navigate('/')
  }

  const handleLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const res = await authAPI.register({
          username: form.username,
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          captcha_token: captchaToken,
          captcha_answer: form.captcha_answer,
        })
        // Email verification is disabled -- registration logs the user in immediately.
        finishLogin(res.data.access_token, res.data.user)
      } else {
        const res = await authAPI.login(form.username, form.password, captchaToken, form.captcha_answer)
        finishLogin(res.data.access_token, res.data.user)
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { otp_required?: boolean; username?: string; error?: string } } }
      if (e?.response?.data?.otp_required) {
        // Registered but never verified -- send them straight to the OTP screen.
        setForm((f) => ({ ...f, username: e.response!.data!.username || f.username }))
        setNotice('Your email is not verified yet. Enter the code we sent you.')
        setMode('verify-otp')
      } else {
        setError(getErrorMessage(err, 'Authentication failed'))
      }
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authAPI.verifyOtp(form.username, otpCode)
      setNotice('Email verified! Signing you in...')
      finishLogin(res.data.access_token, res.data.user)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Verification failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setError('')
    try {
      await authAPI.resendOtp(form.username)
      setNotice('A new code has been sent if the account exists.')
      setResendCooldown(30)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not resend code'))
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)
    try {
      await authAPI.forgotPassword(form.email, captchaToken, form.captcha_answer)
      setNotice(`If an account exists for ${form.email}, a reset code has been sent.`)
      setMode('reset-password')
      setResendCooldown(30)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not send reset code'))
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  const handleBackToForgotPassword = () => {
    setError('')
    setNotice('Enter the CAPTCHA to request a fresh code.')
    setResetOtpCode('')
    setMode('forgot-password')
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      await authAPI.resetPassword(form.email, resetOtpCode, newPassword)
      setNotice('Password reset successfully. Please sign in.')
      setMode('login')
      setForm(EMPTY_FORM)
      setResetOtpCode('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not reset password'))
    } finally {
      setLoading(false)
    }
  }

  const TABS: { id: UserTab; label: string }[] = [
    { id: 'doctor', label: 'Doctor' },
    { id: 'clinician', label: 'Clinician' },
    { id: 'patient-existing', label: 'Patient' },
    { id: 'patient-new', label: 'New Patient' },
  ]

  const showTabs = mode === 'login' || mode === 'register'

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left panel -- illustration + greeting */}
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
            Please enter your details to continue to MedDiagnose AI.
          </p>
        </div>

        {/* Original simple flat illustration -- friendly medical motif */}
        <svg
          className="absolute bottom-0 right-0 w-[70%] max-w-md"
          viewBox="0 0 400 420"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="230" cy="390" rx="140" ry="26" fill="#0f766e" opacity="0.08" />
          {/* coat body */}
          <path d="M120 420 L120 250 Q120 190 200 190 Q280 190 280 250 L280 420 Z" fill="#ffffff" stroke="#0d9488" strokeWidth="4" />
          {/* coat collar/shirt */}
          <path d="M175 200 L200 240 L225 200" fill="none" stroke="#0d9488" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="188" y="205" width="24" height="60" fill="#0f766e" />
          {/* stethoscope */}
          <path d="M160 215 Q160 260 200 260 Q240 260 240 215" fill="none" stroke="#134e4a" strokeWidth="5" strokeLinecap="round" />
          <circle cx="200" cy="270" r="10" fill="#134e4a" />
          {/* head */}
          <circle cx="200" cy="140" r="55" fill="#fcd9b8" />
          {/* hair */}
          <path d="M148 130 Q150 80 200 80 Q250 80 252 130 Q252 100 200 100 Q148 100 148 130 Z" fill="#3f2d20" />
          {/* smile */}
          <path d="M180 158 Q200 172 220 158" fill="none" stroke="#7c4a2d" strokeWidth="3" strokeLinecap="round" />
          <circle cx="178" cy="138" r="4" fill="#3f2d20" />
          <circle cx="222" cy="138" r="4" fill="#3f2d20" />
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
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'register' ? 'Create your account' : mode === 'forgot-password' ? 'Reset your password' : mode === 'reset-password' ? 'Choose a new password' : mode === 'verify-otp' ? 'Verify your email' : 'Sign in'}
            </h2>
          </div>

          {showTabs && (
            <div className="mb-6 grid grid-cols-4 gap-1 bg-slate-100 rounded-xl p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTabChange(t.id)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    tab === t.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          {notice && !error && (
            <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-2.5 rounded-lg mb-4 text-sm">
              {notice}
            </div>
          )}

          {mode === 'forgot-password' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter the email on your account"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  We'll email a 6-digit code to reset your password.
                </p>
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
                    title="Get a new question"
                    className="px-3 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50"
                  >
                    ↻
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={form.captcha_answer}
                  onChange={(e) => setForm({ ...form, captcha_answer: e.target.value })}
                  className="mt-2 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Your answer"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setNotice('') }}
                  className="text-slate-500 hover:text-slate-700 text-sm"
                >
                  ← Back to sign in
                </button>
              </div>
            </form>
          ) : mode === 'reset-password' ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reset code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={resetOtpCode}
                  onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-center text-2xl tracking-[0.5em] font-semibold focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="000000"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Sent to <span className="font-medium">{form.email}</span>. Code expires in 10 minutes.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Re-enter new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading || resetOtpCode.length !== 6}
                className="w-full bg-teal-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <div className="flex items-center justify-between text-sm pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setNotice('') }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ← Back to sign in
                </button>
                <button
                  type="button"
                  onClick={handleBackToForgotPassword}
                  disabled={resendCooldown > 0}
                  className="text-teal-700 hover:text-teal-900 disabled:text-slate-400 font-medium"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          ) : mode === 'verify-otp' ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Verification code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-center text-2xl tracking-[0.5em] font-semibold focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="000000"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Sent to the email on file for <span className="font-medium">{form.username}</span>. Code expires in 10 minutes.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-teal-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>

              <div className="flex items-center justify-between text-sm pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setNotice('') }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ← Back to sign in
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  className="text-teal-700 hover:text-teal-900 disabled:text-slate-400 font-medium"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLoginOrRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {mode === 'register' ? 'Choose a username' : 'Username or Email'}
                </label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Enter username"
                />
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter full name"
                    />
                  </div>
                </>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setError(''); setNotice(''); setMode('forgot-password') }}
                      className="text-xs text-teal-700 hover:text-teal-900 font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2.5 pr-11 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter password"
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

              {/* CAPTCHA */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Security check
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center justify-center bg-slate-100 border border-slate-300 rounded-lg font-mono text-lg tracking-wider text-slate-800 select-none">
                    {captchaQuestion || '...'}
                  </div>
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    title="Get a new question"
                    className="px-3 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50"
                  >
                    ↻
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={form.captcha_answer}
                  onChange={(e) => setForm({ ...form, captcha_answer: e.target.value })}
                  className="mt-2 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Your answer"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-500 text-white py-2.5 px-4 rounded-lg font-medium hover:opacity-95 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Log in'}
              </button>
            </form>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="mt-6 text-center text-sm text-slate-500">
              {mode === 'register' ? (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => handleTabChange('patient-existing')}
                    className="text-teal-700 hover:text-teal-900 font-medium"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => handleTabChange('patient-new')}
                    className="text-teal-700 hover:text-teal-900 font-medium"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}