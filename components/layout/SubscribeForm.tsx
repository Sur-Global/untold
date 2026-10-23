'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { subscribeToNewsletter } from '@/lib/actions/subscribe'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }
// Button is Aeonik Regular; every other line is Aeonik Light.
const light: React.CSSProperties = { ...aeonik, fontWeight: 300 }

const inputClass =
  'h-11 w-full rounded-full border border-[#3a3a3a] bg-[#111] px-5 text-sm text-white outline-none transition-colors placeholder:text-[#78716C] focus:border-[#A9A8E9]'

/** Newsletter sign-up (dark surface), saved to Sender through a server action. */
export function SubscribeForm() {
  const t = useTranslations('subscribe')
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'invalid' | 'failed'>('idle')

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

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[440px] space-y-3 text-left" noValidate>
      {/* Honeypot — hidden from people, bots fill it */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <input name="firstname" type="text" autoComplete="given-name" placeholder={t('namePlaceholder')} aria-label={t('namePlaceholder')} className={inputClass} style={light} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
          aria-label={t('emailLabel')}
          aria-invalid={status === 'invalid'}
          className={inputClass}
          style={light}
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-11 shrink-0 rounded-full px-6 text-sm text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#D2FE73', ...aeonik, fontWeight: 400 }}
        >
          {isPending ? t('sending') : t('submit')}
        </button>
      </div>

      {status === 'invalid' && (
        <p role="alert" className="text-sm text-[#FCA5A5]" style={light}>{t('errorInvalid')}</p>
      )}
      {status === 'failed' && (
        <p role="alert" className="text-sm text-[#FCA5A5]" style={light}>{t('errorFailed')}</p>
      )}
      <p className="text-center text-xs text-[#78716C]" style={light}>{t('privacy')}</p>
    </form>
  )
}
