'use client'

import { useId, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { subscribeToNewsletter } from '@/lib/actions/subscribe'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }
// Button is Aeonik Regular; every other line is Aeonik Light.
const light: React.CSSProperties = { ...aeonik, fontWeight: 300 }

const inputClass =
  'h-11 w-full rounded-full border border-[#3a3a3a] bg-[#111] px-5 text-sm text-white outline-none transition-colors placeholder:text-[#78716C] focus:border-[#A9A8E9]'

// The banner above the footer: a white field with a visible label, a lime button, focus rings that stand out on black.
// `sm:flex-1` and not `flex-1`: stacked on a phone the field must keep its own height instead of shrinking to its text.
const bannerInputClass =
  'h-11 min-w-0 w-full rounded-[10px] border-0 bg-white sm:flex-1 px-3.5 text-sm text-[#0A0A0A] outline-none placeholder:text-[#666] focus-visible:ring-2 focus-visible:ring-[#A9A8E9] focus-visible:ring-offset-2 focus-visible:ring-offset-black'
const bannerButtonClass =
  'h-11 shrink-0 rounded-full bg-[#D2FE73] px-[22px] text-sm text-black transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60'

/**
 * Newsletter sign-up (dark surface), saved to Sender through a server action.
 * `card` (the pop-up): name and email, centred. `banner` (above the footer): only the email, with its label showing.
 */
export function SubscribeForm({ variant = 'card' }: { variant?: 'card' | 'banner' }) {
  const t = useTranslations('subscribe')
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'invalid' | 'failed'>('idle')
  const emailId = useId()
  const errorId = `${emailId}-error`
  const banner = variant === 'banner'

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setStatus('idle')
    startTransition(async () => {
      const result = await subscribeToNewsletter(fd)
      if (result.ok) {
        setStatus('success')
        form.reset()
      } else {
        setStatus(result.code)
      }
    })
  }

  if (status === 'success') {
    return (
      <p role="status" className="py-3 text-base text-[#D2FE73]" style={light}>
        {t('success')}
      </p>
    )
  }

  const hasError = status === 'invalid' || status === 'failed'

  return (
    <form onSubmit={handleSubmit} className={banner ? 'w-full space-y-2 text-left' : 'mx-auto w-full max-w-[440px] space-y-3 text-left'} noValidate>
      {/* Honeypot — hidden from people, bots fill it */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {!banner && (
        <input name="firstname" type="text" autoComplete="given-name" placeholder={t('namePlaceholder')} aria-label={t('namePlaceholder')} className={inputClass} style={light} />
      )}
      {banner && (
        <label htmlFor={emailId} className="block text-xs text-white" style={light}>{t('emailLabel')}</label>
      )}
      <div className={banner ? 'flex flex-col gap-2 sm:flex-row' : 'flex flex-col gap-3 sm:flex-row'}>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
          aria-label={banner ? undefined : t('emailLabel')}
          aria-invalid={status === 'invalid'}
          aria-describedby={hasError ? errorId : undefined}
          className={banner ? bannerInputClass : inputClass}
          style={light}
        />
        <button
          type="submit"
          disabled={isPending}
          className={banner ? bannerButtonClass : 'h-11 shrink-0 rounded-full px-6 text-sm text-black transition-opacity hover:opacity-90 disabled:opacity-60'}
          style={banner ? { ...aeonik, fontWeight: 500 } : { backgroundColor: '#D2FE73', ...aeonik, fontWeight: 400 }}
        >
          {isPending ? t('sending') : t('submit')}
        </button>
      </div>

      {status === 'invalid' && (
        <p id={errorId} role="alert" className="text-sm text-[#FCA5A5]" style={light}>{t('errorInvalid')}</p>
      )}
      {status === 'failed' && (
        <p id={errorId} role="alert" className="text-sm text-[#FCA5A5]" style={light}>{t('errorFailed')}</p>
      )}
      <p className={banner ? 'text-xs leading-snug text-[#A8A29E]' : 'text-center text-xs text-[#78716C]'} style={light}>{t('privacy')}</p>
    </form>
  )
}
