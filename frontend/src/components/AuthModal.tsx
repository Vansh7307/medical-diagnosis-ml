import type { ReactNode } from 'react'

interface AuthModalProps {
  children: ReactNode
}

/** Shared glass surface for the sign-in and registration flows. */
export default function AuthModal({ children }: AuthModalProps) {
  return (
    <section className="auth-modal w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {children}
    </section>
  )
}
