import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'

type Mode = 'login' | 'register' | 'verify-otp' | 'forgot-password' | 'reset-password'

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
        await authAPI.register({
          username: form.username,
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          captcha_token: captchaToken,
          captcha_answer: form.captcha_answer,
        })
        setNotice(`We sent a 6-digit verification code to ${form.email}.`)
        setMode('verify-otp')
        setResendCooldown(30)
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

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-b from-slate-950 via-blue-950 to-blue-900 overflow-hidden px-4">
      {/* Night sky glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl" />

      {/* Hospital skyline illustration, anchored to the bottom of the viewport */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full h-[55vh] min-h-[340px]"
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* distant skyline, low opacity */}
        <g opacity="0.35" fill="#0b1a3a">
          <rect x="0" y="260" width="70" height="140" />
          <rect x="80" y="230" width="55" height="170" />
          <rect x="150" y="280" width="90" height="120" />
          <rect x="980" y="250" width="80" height="150" />
          <rect x="1070" y="290" width="60" height="110" />
          <rect x="1140" y="240" width="60" height="160" />
        </g>

        {/* side buildings */}
        <g fill="#102552">
          <rect x="0" y="200" width="180" height="200" />
          <rect x="1020" y="180" width="180" height="220" />
        </g>
        <g fill="#1b3a73" opacity="0.9">
          {Array.from({ length: 4 }).map((_, row) =>
            Array.from({ length: 4 }).map((_, col) => (
              <rect
                key={`l-${row}-${col}`}
                x={20 + col * 38}
                y={225 + row * 38}
                width="18"
                height="22"
                fill={(row + col) % 3 === 0 ? '#fde68a' : '#1b3a73'}
                opacity={(row + col) % 3 === 0 ? 0.85 : 1}
              />
            ))
          )}
          {Array.from({ length: 4 }).map((_, row) =>
            Array.from({ length: 4 }).map((_, col) => (
              <rect
                key={`r-${row}-${col}`}
                x={1045 + col * 38}
                y={205 + row * 38}
                width="18"
                height="22"
                fill={(row + col) % 2 === 0 ? '#fde68a' : '#1b3a73'}
                opacity={(row + col) % 2 === 0 ? 0.85 : 1}
              />
            ))
          )}
        </g>

        {/* central hospital building */}
        <rect x="330" y="90" width="540" height="310" fill="#173163" />
        {/* helipad wing */}
        <rect x="330" y="140" width="150" height="260" fill="#122a56" />
        <rect x="720" y="140" width="150" height="260" fill="#122a56" />

        {/* window grid, some lit */}
        <g>
          {Array.from({ length: 7 }).map((_, row) =>
            Array.from({ length: 13 }).map((_, col) => {
              const lit = (row * 13 + col) % 5 === 0
              return (
                <rect
                  key={`m-${row}-${col}`}
                  x={350 + col * 39}
                  y={110 + row * 36}
                  width="20"
                  height="24"
                  rx="1.5"
                  fill={lit ? '#fef3c7' : '#284785'}
                  opacity={lit ? 0.95 : 0.9}
                />
              )
            })
          )}
        </g>

        {/* main entrance */}
        <rect x="560" y="330" width="80" height="70" fill="#0d1f42" />
        <rect x="575" y="340" width="18" height="60" fill="#93c5fd" opacity="0.7" />
        <rect x="605" y="340" width="18" height="60" fill="#93c5fd" opacity="0.7" />
        <rect x="330" y="396" width="540" height="6" fill="#0a1730" />

        {/* rooftop medical cross sign, glowing red */}
        <rect x="578" y="55" width="44" height="44" rx="4" fill="#dc2626" />
        <rect x="592" y="63" width="16" height="28" fill="white" />
        <rect x="570" y="71" width="60" height="12" fill="white" />
        <rect x="596" y="99" width="8" height="14" fill="#0d1f42" />

        {/* ambulance light glow accents on side towers */}
        <circle cx="405" cy="115" r="3" fill="#f87171" opacity="0.9" />
        <circle cx="795" cy="115" r="3" fill="#f87171" opacity="0.9" />

        {/* ECG heartbeat pulse line running along the ground */}
        <polyline
          points="0,375 260,375 300,375 320,330 345,410 370,355 400,375 1200,375"
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="3"
          opacity="0.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* subtle star/dot texture over the whole scene */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
          {/* header */}
          <div className="bg-gradient-to-r from-blue-700 to-teal-600 px-8 pt-8 pb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
              <span className="text-3xl leading-none">⚕️</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">MedDiagnose AI</h1>
            <p className="text-blue-100/90 mt-1 text-sm">Medical Diagnosis with Machine Learning</p>
          </div>

          <div className="p-8">
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

                {/* CAPTCHA */}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
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
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Enter password"
                  />
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
                  className="w-full bg-gradient-to-r from-blue-700 to-teal-600 text-white py-2.5 px-4 rounded-lg font-medium hover:opacity-95 disabled:opacity-50 transition-opacity"
                >
                  {loading ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Sign In'}
                </button>
              </form>
            )}

            {(mode === 'login' || mode === 'register') && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setMode(mode === 'register' ? 'login' : 'register')
                    setError('')
                    setNotice('')
                  }}
                  className="text-teal-700 hover:text-teal-900 text-sm font-medium"
                >
                  {mode === 'register' ? 'Already have an account? Sign In' : 'Need an account? Register'}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-blue-200/70 mt-4">
          For clinical use by authorized medical staff only. New accounts require role approval by an administrator.
        </p>
      </div>
    </div>
  )
}
