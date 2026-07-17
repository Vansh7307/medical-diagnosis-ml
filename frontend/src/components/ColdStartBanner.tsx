import { useEffect, useState } from 'react'

export default function ColdStartBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = () => setVisible(true)
    const hide = () => setVisible(false)
    window.addEventListener('coldstart:show', show)
    window.addEventListener('coldstart:hide', hide)
    return () => {
      window.removeEventListener('coldstart:show', show)
      window.removeEventListener('coldstart:hide', hide)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-sm flex items-center justify-center gap-2 shadow-sm">
      <svg className="animate-spin h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span>Waking up the server — this can take up to a minute after inactivity. Hang tight…</span>
    </div>
  )
}