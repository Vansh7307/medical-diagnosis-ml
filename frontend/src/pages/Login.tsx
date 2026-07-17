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

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-b from-slate-950 via-blue-950 to-blue-900 overflow-hidden px-4">
      {/* Night sky with medical theme glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl" />
      
      {/* Medical inspired background stars */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full bg-blue-300/40"
            style={{
              width: Math.random() > 0.5 ? '2px' : '1px',
              height: Math.random() > 0.5 ? '2px' : '1px',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 40}%`,
              animation: `twinkle ${2 + Math.random() * 3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Enhanced Hospital skyline illustration with medical elements */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full h-[60vh] min-h-[350px]"
        viewBox="0 0 1400 450"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`
            @keyframes twinkle {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.9; }
            }
            @keyframes ambulanceLight {
              0%, 100% { fill: #dc2626; }
              50% { fill: #fbbf24; }
            }
            @keyframes helicopterBlade {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </defs>

        {/* distant skyline buildings */}
        <g opacity="0.25" fill="#0b1a3a">
          <rect x="0" y="280" width="80" height="170" />
          <rect x="100" y="250" width="65" height="200" />
          <rect x="180" y="310" width="100" height="140" />
          <rect x="1180" y="280" width="90" height="170" />
          <rect x="1100" y="320" width="70" height="130" />
          <rect x="1280" y="270" width="70" height="180" />
        </g>

        {/* side buildings with windows */}
        <g fill="#0f2a5a">
          <rect x="0" y="220" width="200" height="230" />
          <rect x="1200" y="200" width="200" height="250" />
        </g>

        {/* side building windows */}
        <g fill="#fef3c7" opacity="0.5">
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 5 }).map((_, col) => (
              <rect
                key={`lw-${row}-${col}`}
                x={15 + col * 32}
                y={240 + row * 32}
                width="16"
                height="20"
                rx="1"
              />
            ))
          )}
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 5 }).map((_, col) => (
              <rect
                key={`rw-${row}-${col}`}
                x={1215 + col * 32}
                y={220 + row * 32}
                width="16"
                height="20"
                rx="1"
              />
            ))
          )}
        </g>

        {/* Main hospital building - larger and more prominent */}
        <rect x="300" y="60" width="800" height="360" fill="#1a3a52" rx="8" />
        
        {/* Hospital wings */}
        <rect x="280" y="140" width="180" height="280" fill="#0f2a5a" opacity="0.8" />
        <rect x="940" y="140" width="180" height="280" fill="#0f2a5a" opacity="0.8" />

        {/* Main window grid with animated lighting */}
        <g>
          {Array.from({ length: 9 }).map((_, row) =>
            Array.from({ length: 16 }).map((_, col) => {
              const isLit = (row * 16 + col) % 4 === 0
              return (
                <rect
                  key={`m-${row}-${col}`}
                  x={320 + col * 42}
                  y={90 + row * 36}
                  width="24"
                  height="28"
                  rx="2"
                  fill={isLit ? '#fef08a' : '#1f4d7a'}
                  opacity={isLit ? 0.95 : 0.7}
                />
              )
            })
          )}
        </g>

        {/* Emergency Department (bright red accent) */}
        <g>
          <rect x="550" y="370" width="120" height="90" fill="#b91c1c" rx="4" />
          <text x="610" y="410" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">
            EMERGENCY
          </text>
          {/* Emergency entrance lights */}
          <circle cx="565" cy="385" r="6" fill="#fbbf24" opacity="0.9" />
          <circle cx="655" cy="385" r="6" fill="#fbbf24" opacity="0.9" />
        </g>

        {/* Medical Cross on Roof - Glowing */}
        <g>
          <circle cx="700" cy="45" r="35" fill="#dc2626" opacity="0.3" />
          <rect x="685" y="35" width="30" height="40" fill="#dc2626" rx="2" />
          <rect x="675" y="45" width="50" height="20" fill="#dc2626" rx="2" />
          <rect x="695" y="38" width="10" height="34" fill="white" />
          <rect x="678" y="48" width="44" height="12" fill="white" />
        </g>

        {/* Helicopter on roof (medical transport) */}
        <g>
          {/* Helicopter body */}
          <ellipse cx="200" cy="65" rx="18" ry="12" fill="#10b981" />
          {/* Helicopter rotor */}
          <g transform="translate(200, 65)" opacity="0.8">
            <line x1="-25" y1="0" x2="25" y2="0" stroke="#10b981" strokeWidth="2" />
            <line x1="0" y1="-25" x2="0" y2="25" stroke="#10b981" strokeWidth="2" />
          </g>
          {/* Helicopter landing skids */}
          <line x1="185" y1="75" x2="185" y2="85" stroke="#10b981" strokeWidth="2" />
          <line x1="215" y1="75" x2="215" y2="85" stroke="#10b981" strokeWidth="2" />
          <text x="200" y="105" fontSize="10" fill="#10b981" textAnchor="middle" fontWeight="bold">
            MEDEVAC
          </text>
        </g>

        {/* Ambulances at entrance */}
        <g>
          {/* Ambulance 1 */}
          <g>
            <rect x="100" y="385" width="60" height="35" fill="#fff" rx="3" />
            <rect x="115" y="375" width="30" height="10" fill="#fff" rx="2" />
            {/* Red stripe */}
            <rect x="100" y="400" width="60" height="8" fill="#dc2626" />
            {/* Windows */}
            <rect x="108" y="390" width="12" height="10" fill="#1a3a52" />
            <rect x="130" y="390" width="12" height="10" fill="#1a3a52" />
            {/* Medical cross */}
            <rect x="153" y="397" width="4" height="6" fill="#dc2626" />
            <rect x="151" y="399" width="8" height="2" fill="#dc2626" />
          </g>

          {/* Ambulance 2 */}
          <g>
            <rect x="1250" y="390" width="60" height="35" fill="#fff" rx="3" />
            <rect x="1265" y="380" width="30" height="10" fill="#fff" rx="2" />
            {/* Red stripe */}
            <rect x="1250" y="405" width="60" height="8" fill="#dc2626" />
            {/* Windows */}
            <rect x="1258" y="395" width="12" height="10" fill="#1a3a52" />
            <rect x="1280" y="395" width="12" height="10" fill="#1a3a52" />
          </g>
        </g>

        {/* Ground/parking area */}
        <rect x="0" y="410" width="1400" height="40" fill="#0a1730" />
        
        {/* Parking lines */}
        <g stroke="#2dd4bf" strokeWidth="1" opacity="0.3" strokeDasharray="5,5">
          <line x1="0" y1="425" x2="1400" y2="425" />
          <line x1="0" y1="435" x2="1400" y2="435" />
        </g>

        {/* ECG/Medical heartbeat line - animated */}
        <polyline
          points="0,390 150,390 180,365 210,415 250,390 400,390 450,365 480,415 520,390 700,390 750,365 800,415 900,390 1100,390 1150,365 1180,415 1400,390"
          fill="none"
          stroke="#2dd4bf"
          strokeWidth="2"
          opacity="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Building details - entrance pillars */}
        <g fill="#0a2744">
          <rect x="280" y="160" width="20" height="280" />
          <rect x="1100" y="160" width="20" height="280" />
        </g>

        {/* Flag pole with medical flag */}
        <g>
          <line x1="1350" y1="100" x2="1350" y2="180" stroke="#666" strokeWidth="3" />
          <polygon points="1350,100 1350,115 1375,107.5" fill="#dc2626" />
        </g>
      </svg>

      {/* Animated keyword floating */}
      <div className="pointer-events-none absolute bottom-20 left-10 text-teal-300/40 text-sm font-mono">
        Hospital Authentication System
      </div>
      <div className="pointer-events-none absolute bottom-32 right-10 text-blue-300/30 text-xs font-mono">
        Secure Medical Diagnosis
      </div>

      {/* subtle texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
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
            <p className="text-blue-100/90 mt-1 text-sm">AI-Powered Medical Diagnosis Platform</p>
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