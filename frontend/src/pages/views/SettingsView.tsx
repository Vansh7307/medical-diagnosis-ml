import { useState } from 'react'
import { MetricCard } from '../../components/MetricCard'

export default function SettingsView() {
  const [hipaaEnabled, setHipaaEnabled] = useState(true)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSaveSettings = () => {
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <p className="eyebrow">Administration</p>
        <h1 className="text-3xl font-bold text-white">Settings & Compliance Configuration</h1>
        <p className="text-slate-400 mt-2">HIPAA compliance mode toggle, API key management, reCAPTCHA configuration, theme customization, system settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Active Users" value={847} accent="#22d3ee" />
        <MetricCard label="API Keys" value={12} accent="#34d399" />
        <MetricCard label="HIPAA Enabled" value="Yes" accent="#34d399" />
        <MetricCard label="Last Sync" value="2m ago" accent="#a78bfa" />
      </div>

      {saveSuccess && (
        <div className="fixed top-4 right-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-lg text-sm">
          ✓ Settings saved successfully
        </div>
      )}

      {/* HIPAA Compliance Settings */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">🔐 HIPAA Compliance & Data Privacy</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-emerald-500/30">
            <div>
              <p className="font-semibold text-white">HIPAA Compliance Mode</p>
              <p className="text-xs text-slate-400 mt-1">Enable strict HIPAA enforcement for protected health information (PHI)</p>
            </div>
            <button
              onClick={() => setHipaaEnabled(!hipaaEnabled)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                hipaaEnabled ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  hipaaEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-2">
            <p className="text-sm font-semibold text-white">Enabled Features:</p>
            <ul className="text-xs space-y-1 text-slate-300">
              <li>✓ Encrypted data transmission (AES-256)</li>
              <li>✓ Audit logging for all PHI access</li>
              <li>✓ Role-based access control (RBAC)</li>
              <li>✓ Automatic session timeout (15 min)</li>
              <li>✓ Data anonymization on export</li>
              <li>✓ Compliance report generation (monthly)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Key Management */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">🔑 API Key Management</h3>

        <div className="space-y-3">
          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-sm">Production API Key</p>
                <p className="text-xs text-slate-400 mt-1">sk-prod-MdMLDiag-*****</p>
              </div>
              <button
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                className="px-3 py-1 text-xs rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
              >
                {apiKeyVisible ? 'Hide' : 'Show'}
              </button>
            </div>
            {apiKeyVisible && (
              <div className="mt-3 p-3 bg-slate-900/50 rounded font-mono text-xs text-slate-300 break-all">
                sk-prod-MdMLDiag-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-sm">Sandbox API Key</p>
                <p className="text-xs text-slate-400 mt-1">sk-test-MdMLDiag-*****</p>
              </div>
              <button className="px-3 py-1 text-xs rounded bg-orange-500/20 text-orange-300 hover:bg-orange-500/30">
                Regenerate
              </button>
            </div>
          </div>

          <button className="w-full px-4 py-2 text-sm rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30">
            + Generate New API Key
          </button>
        </div>
      </div>

      {/* reCAPTCHA Configuration */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">🤖 reCAPTCHA v2 Configuration</h3>

        <div className="space-y-4">
          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <label className="block text-sm font-semibold text-white mb-2">Site Key</label>
            <input
              type="text"
              placeholder="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
              className="w-full px-3 py-2 rounded-lg bg-slate-900/50 text-slate-300 text-sm border border-white/10 focus:border-cyan-500 outline-none"
            />
          </div>

          <div className="rounded-lg bg-white/5 border border-white/10 p-4">
            <label className="block text-sm font-semibold text-white mb-2">Secret Key</label>
            <input
              type="password"
              placeholder="••••••••••••••••••••"
              className="w-full px-3 py-2 rounded-lg bg-slate-900/50 text-slate-300 text-sm border border-white/10 focus:border-cyan-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
            <input type="checkbox" id="recaptcha" defaultChecked className="w-4 h-4" />
            <label htmlFor="recaptcha" className="text-sm text-slate-300">
              Enable reCAPTCHA v2 for login forms
            </label>
          </div>
        </div>
      </div>

      {/* Theme Customization */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">🎨 Theme & Appearance</h3>

        <div>
          <label className="text-sm font-semibold text-white mb-3 block">Theme Selection</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'dark', label: '🌙 Dark Mode', color: '#060709' },
              { id: 'light', label: '☀️ Light Mode', color: '#ffffff' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  theme === t.id
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-white mb-2 block">Accent Color</label>
          <div className="flex gap-2">
            {[
              { name: 'Cyan', color: '#22d3ee' },
              { name: 'Emerald', color: '#34d399' },
              { name: 'Purple', color: '#a78bfa' },
            ].map((accent) => (
              <button
                key={accent.color}
                style={{ backgroundColor: accent.color }}
                className="w-10 h-10 rounded-lg border-2 border-white/20 hover:border-white/50 transition-colors"
                title={accent.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* System Preferences */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">⚙️ System Preferences</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm text-slate-300">Enable email notifications for critical alerts</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm text-slate-300">Auto-save session data</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
            <input type="checkbox" className="w-4 h-4" />
            <span className="text-sm text-slate-300">Enable anonymous usage analytics</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-sm text-slate-300">Strict data retention (90-day purge)</span>
          </label>
        </div>
      </div>

      {/* Session Management */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">👤 Session Management</h3>

        <div className="space-y-3">
          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            <p className="text-xs text-slate-400">Session Timeout</p>
            <div className="flex items-center gap-2 mt-2">
              <select className="flex-1 px-3 py-1 text-sm rounded-lg bg-slate-900/50 text-slate-300 border border-white/10">
                <option>5 minutes</option>
                <option selected>15 minutes</option>
                <option>30 minutes</option>
                <option>1 hour</option>
              </select>
            </div>
          </div>

          <button className="w-full px-4 py-2 text-sm rounded-lg bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30">
            Sign Out All Sessions
          </button>
        </div>
      </div>

      {/* Save Settings Button */}
      <button
        onClick={handleSaveSettings}
        className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-4 font-semibold text-white hover:opacity-90 transition-opacity text-lg"
      >
        💾 Save All Settings
      </button>

      {/* Privacy & Compliance Info */}
      <div className="glass-panel p-6 border-l-4 border-cyan-500">
        <h3 className="text-sm font-bold text-cyan-300">ℹ️ Privacy & Compliance Information</h3>
        <p className="text-xs text-slate-400 mt-2">
          This system is HIPAA-compliant and FHIR R4 aligned. All data is encrypted in transit and at rest. For detailed privacy policies and terms of service, please consult our documentation.
        </p>
      </div>
    </div>
  )
}
