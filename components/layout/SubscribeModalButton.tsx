'use client'

import { useEffect, useRef, useState } from 'react'
import { SUBSCRIBE_FORM_URL } from '@/lib/subscribe'
import { SubscribeForm } from '@/components/layout/SubscribeForm'
import { useTranslations } from 'next-intl'

interface Props {
  label: string
  closeLabel: string
  formTitle: string
  /** true once Sender's API token is set: show our own form instead of Sender's hosted one */
  native?: boolean
}

/** Footer "Subscribe" button: opens the Sender form in a pop-up window over the page. */
export function SubscribeModalButton({ label, closeLabel, formTitle, native = false }: Props) {
  const t = useTranslations('subscribe')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 inline-flex h-10 items-center rounded-full px-6 text-sm text-black transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#D2FE73', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 400 }}
      >
        {label}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Click on the backdrop (the dialog element itself) closes it
          if (e.target === dialogRef.current) setOpen(false)
        }}
        className={`m-auto w-[calc(100%-2rem)] max-w-[500px] overflow-hidden rounded-2xl p-0 shadow-2xl backdrop:bg-black/60 ${native ? 'border border-white/15 bg-black' : 'bg-white'}`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={closeLabel}
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none ${native ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-black hover:bg-black/10'}`}
        >
          ×
        </button>
        {open && native && (
          <div className="px-6 py-12 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.08em] text-[#A9A8E9]" style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 300 }}>{t('eyebrow')}</p>
            <h2 className="mb-3 text-2xl text-white" style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{t('title')}</h2>
            <p className="mx-auto mb-6 max-w-[360px] text-sm text-[#A8A29E]" style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 300 }}>{t('subtitle')}</p>
            <SubscribeForm />
          </div>
        )}
        {open && !native && (
          <iframe
            src={SUBSCRIBE_FORM_URL}
            title={formTitle}
            className="block h-[min(640px,85vh)] w-full border-0"
          />
        )}
      </dialog>
    </>
  )
}
