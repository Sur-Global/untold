'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import Script from 'next/script'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import {
  CONSENT_COOKIE,
  CONSENT_EVENT,
  PRIVACY_POLICY_PATH,
  analyticsCookieNames,
  getGaMeasurementId,
  parseConsent,
  serializeConsent,
  type ConsentChoice,
} from '@/lib/analytics/consent'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

// The choice lives in a cookie; this tiny store lets React read it (and re-render when it changes)
// without a server/client mismatch: the server always sees "unknown".
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const notify = () => listeners.forEach((l) => l())
type Snapshot = ConsentChoice | null | 'unknown'
const getSnapshot = (): Snapshot => parseConsent(document.cookie)
const getServerSnapshot = (): Snapshot => 'unknown'

/**
 * Asks for permission to use analytics cookies and, only after "accept", loads Google Analytics.
 * Renders nothing at all until a measurement id is configured (NEXT_PUBLIC_GA_MEASUREMENT_ID).
 */
export function CookieConsent() {
  const t = useTranslations('cookies')
  const gaId = getGaMeasurementId()
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const ready = snapshot !== 'unknown'
  const choice: ConsentChoice | null = snapshot === 'unknown' ? null : snapshot
  const [reopened, setReopened] = useState(false)

  useEffect(() => {
    const reopen = () => setReopened(true)
    window.addEventListener(CONSENT_EVENT, reopen)
    return () => window.removeEventListener(CONSENT_EVENT, reopen)
  }, [])

  const decide = useCallback(
    (next: ConsentChoice) => {
      document.cookie = serializeConsent(next)
      notify()
      setReopened(false)
      if (next === 'denied' && gaId) {
        // Stop any already-loaded tag from collecting and remove its cookies
        ;(window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = true
        for (const name of analyticsCookieNames(document.cookie)) {
          document.cookie = `${name}=; Max-Age=0; Path=/`
          document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${location.hostname}`
          document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${location.hostname.replace(/^www\./, '')}`
        }
      } else if (next === 'granted' && gaId) {
        ;(window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = false
      }
    },
    [gaId],
  )

  if (!gaId || !ready) return null

  const showBanner = choice === null || reopened

  return (
    <>
      {choice === 'granted' && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { anonymize_ip: true });`}
          </Script>
        </>
      )}

      {showBanner && (
        <div
          role="dialog"
          aria-label={t('title')}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl p-4 shadow-2xl sm:p-5"
          style={{ background: '#000', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', ...aeonik }}
        >
          <p className="text-sm leading-relaxed text-[#E7E5E4]">
            {t('text')}{' '}
            <Link href={PRIVACY_POLICY_PATH} className="underline underline-offset-4 hover:text-[#D2FE73]">
              {t('policy')}
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => decide('granted')}
              className="h-10 rounded-full px-5 text-sm font-medium text-black transition-opacity hover:opacity-90"
              style={{ background: '#D2FE73' }}
            >
              {t('accept')}
            </button>
            <button
              type="button"
              onClick={() => decide('denied')}
              className="h-10 rounded-full border border-white/40 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              {t('decline')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export { CONSENT_COOKIE }
