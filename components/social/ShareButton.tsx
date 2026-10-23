'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { FaBluesky, FaEnvelope, FaFacebook, FaInstagram, FaLink, FaLinkedin, FaReddit, FaTelegram, FaThreads, FaWhatsapp, FaXTwitter } from 'react-icons/fa6'
import { cleanShareUrl, INSTAGRAM_URL, shareLinks, type ShareTarget } from '@/lib/share'

interface ShareButtonProps {
  title: string
  className?: string
}

const ICONS: Record<ShareTarget, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  bluesky: FaBluesky,
  linkedin: FaLinkedin,
  instagram: FaInstagram,
  whatsapp: FaWhatsapp,
  facebook: FaFacebook,
  telegram: FaTelegram,
  reddit: FaReddit,
  threads: FaThreads,
  x: FaXTwitter,
  email: FaEnvelope,
}

const itemClass = 'flex flex-col items-center gap-1.5 rounded-lg p-2 text-center text-[11px] leading-tight text-foreground transition-colors hover:bg-muted'
const circleClass = 'flex size-11 items-center justify-center rounded-full bg-muted text-foreground'

/** Share menu: the social networks people use most, copy link and, on phones, the device's own share sheet. */
export function ShareButton({ title, className }: ShareButtonProps) {
  const t = useTranslations('share')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [instagramHint, setInstagramHint] = useState(false)
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

  // Worked out when the menu opens (the page address only exists in the browser)
  const url = open ? cleanShareUrl(window.location.href) : ''
  const canShareNatively = open && typeof navigator.share === 'function'

  const copy = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch {
      return false // the browser blocked it: nothing to confirm
    }
  }

  const copyLink = async () => {
    if (!(await copy())) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  // Instagram has no web address for sharing: on a phone the device's share sheet lists Instagram; elsewhere
  // the link is copied and Instagram is opened, so it can be pasted into a story, post or message.
  const shareOnInstagram = async () => {
    if (typeof navigator.share === 'function' && window.matchMedia?.('(pointer: coarse)')?.matches) {
      setOpen(false)
      void navigator.share({ title, url }).catch(() => {})
      return
    }
    window.open(INSTAGRAM_URL, '_blank', 'noopener,noreferrer') // first, while the click still allows opening a tab
    if (await copy()) {
      setInstagramHint(true)
      window.setTimeout(() => setInstagramHint(false), 8000)
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
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
            className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-primary/15 bg-card p-3 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[320px]"
          >
            <div className="mb-1 flex items-center justify-between px-2 pt-1">
              <p className="text-sm font-semibold text-foreground">{t('dialog')}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('close')} className="rounded p-1 text-muted-foreground hover:text-foreground sm:hidden">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {shareLinks({ url, title, emailLabel: t('email') }).map(({ id, label, href }) => {
                const Icon = ICONS[id]
                if (href === null) {
                  return (
                    <button key={id} type="button" onClick={shareOnInstagram} className={itemClass}>
                      <span className={circleClass}><Icon size={20} aria-hidden /></span>
                      {label}
                    </button>
                  )
                }
                return (
                  <a
                    key={id}
                    href={href}
                    target={id === 'email' ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className={itemClass}
                    onClick={() => setOpen(false)}
                  >
                    <span className={circleClass}><Icon size={20} aria-hidden /></span>
                    {label}
                  </a>
                )
              })}
              <button type="button" onClick={copyLink} className={itemClass}>
                <span className={circleClass}><FaLink size={18} aria-hidden /></span>
                {copied ? t('copied') : t('copyLink')}
              </button>
              {canShareNatively && (
                <button
                  type="button"
                  className={itemClass}
                  onClick={() => {
                    setOpen(false)
                    void navigator.share({ title, url }).catch(() => {})
                  }}
                >
                  <span className={circleClass}><span aria-hidden className="text-lg leading-none">⋯</span></span>
                  {t('more')}
                </button>
              )}
            </div>
            {instagramHint && <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs leading-snug text-foreground">{t('instagramHint')}</p>}
            <p className="sr-only" aria-live="polite">{copied ? t('copied') : ''}</p>
          </div>
        </>
      )}
    </div>
  )
}
