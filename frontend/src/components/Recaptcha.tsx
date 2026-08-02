import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: HTMLElement, params: Record<string, unknown>) => number
      reset: (widgetId?: number) => void
      getResponse: (widgetId?: number) => string
    }
    __recaptchaOnLoadCallback?: () => void
  }
}

const SCRIPT_ID = 'google-recaptcha-script'

function loadRecaptchaScript(onReady: () => void) {
  if (window.grecaptcha) {
    onReady()
    return
  }
  if (document.getElementById(SCRIPT_ID)) {
    // Script tag already added by another mounted instance -- just wait for it
    window.__recaptchaOnLoadCallback = onReady
    return
  }
  window.__recaptchaOnLoadCallback = onReady
  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.src = 'https://www.google.com/recaptcha/api.js?onload=__recaptchaOnLoadCallback&render=explicit'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

export interface RecaptchaHandle {
  reset: () => void
}

interface RecaptchaProps {
  onVerify: (token: string) => void
  onExpire?: () => void
}

/**
 * Google reCAPTCHA v2 (checkbox) widget. Requires VITE_RECAPTCHA_SITE_KEY
 * to be set at build time -- this is the PUBLIC site key, safe to expose
 * in frontend code (unlike the secret key, which only ever lives on the
 * backend).
 */
const Recaptcha = forwardRef<RecaptchaHandle, RecaptchaProps>(({ onVerify, onExpire }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<number | null>(null)

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (window.grecaptcha && widgetIdRef.current !== null) {
        window.grecaptcha.reset(widgetIdRef.current)
      }
    },
  }))

  useEffect(() => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    if (!siteKey) {
      // eslint-disable-next-line no-console
      console.error('VITE_RECAPTCHA_SITE_KEY is not set -- reCAPTCHA cannot render.')
      return
    }

    let cancelled = false
    loadRecaptchaScript(() => {
      if (cancelled || !containerRef.current || widgetIdRef.current !== null) return
      widgetIdRef.current = window.grecaptcha!.render(containerRef.current, {
        sitekey: siteKey,
        callback: onVerify,
        'expired-callback': onExpire,
      })
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} />
})

Recaptcha.displayName = 'Recaptcha'
export default Recaptcha