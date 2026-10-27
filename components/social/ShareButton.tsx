'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Link2, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cleanShareUrl, copyText, emailShareHref } from '@/lib/share'

interface ShareButtonProps {
  title: string
  className?: string
}

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }
const rowClass = 'flex w-full items-center justify-between border-t border-black/15 py-4 text-left font-mono text-xs uppercase tracking-[0.06em] text-foreground transition-colors hover:text-primary'

/** Share menu: copy the link, or send it by email. Under the button on a computer, a sheet at the bottom of the screen on a phone. */
export function ShareButton({ title, className }: ShareButtonProps) {
  const t = useTranslations('share')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  // the address, to copy by hand, when the browser would not let us copy it
  const [manual, setManual] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    setOpen((v) => !v)
    setCopied(false)
    setManual(null)
  }

  // Worked out when the menu opens (the page address only exists in the browser)
  const url = open ? cleanShareUrl(window.location.href) : ''

  const copyLink = async () => {
    if (await copyText(url)) {
      setManual(null)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } else {
      setManual(url)
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button type="button" onClick={toggle} className={className} aria-haspopup="dialog" aria-expanded={open}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M15 13.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM5 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM15 1.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12.5 3.5l-5 3M7.5 11.5l5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {t('button')}
      </button>

      {open && (
        <>
          {/* phones: a sheet at the bottom of the screen; larger screens: a popover under the button */}
          <div className="fixed inset-0 z-40 bg-black/30 sm:hidden" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label={t('dialog')}
            className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-black/10 bg-[#f7f6f2] px-5 pb-1 pt-4 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[300px]"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[17px] font-medium text-foreground" style={aeonik}>{t('dialog')}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('close')} className="rounded p-1 text-muted-foreground hover:text-foreground sm:hidden">
                ✕
              </button>
            </div>

            <button type="button" onClick={copyLink} className={`${rowClass} ${copied ? 'text-[#2f6f3e]' : ''}`}>
              <span role="status">{copied ? t('copied') : t('copyLink')}</span>
              {copied ? <Check size={18} aria-hidden /> : <Link2 size={18} aria-hidden />}
            </button>
            {manual && (
              <div className="pb-4">
                <p className="mb-2 text-[13px] text-muted-foreground">{t('copyFailed')}</p>
                <input
                  readOnly
                  value={manual}
                  aria-label={t('copyLink')}
                  autoFocus
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-[13px] text-foreground"
                />
              </div>
            )}

            <a href={emailShareHref({ url, title })} onClick={() => setOpen(false)} className={rowClass}>
              <span>{t('email')}</span>
              <Mail size={18} aria-hidden />
            </a>
          </div>
        </>
      )}
    </div>
  )
}
