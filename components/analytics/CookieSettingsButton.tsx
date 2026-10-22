'use client'

import { useTranslations } from 'next-intl'
import { CONSENT_EVENT, getGaMeasurementId } from '@/lib/analytics/consent'

/** Footer link that reopens the cookie banner so a visitor can change their choice. Hidden until analytics is configured. */
export function CookieSettingsButton() {
  const t = useTranslations('cookies')
  if (!getGaMeasurementId()) return null
  return (
    <>
      <span className="mx-2" aria-hidden>·</span>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(CONSENT_EVENT))}
        className="underline-offset-4 transition-colors hover:text-[#A9A8E9] hover:underline"
      >
        {t('settings')}
      </button>
    </>
  )
}
