'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FaBluesky, FaEnvelope, FaFacebook, FaInstagram, FaLink, FaLinkedin, FaReddit, FaTelegram, FaThreads, FaWhatsapp, FaXTwitter } from 'react-icons/fa6'
import { cleanShareUrl, INSTAGRAM_URL, shareLinks, type ShareTarget } from '@/lib/share'

const ICONS: Record<ShareTarget, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  bluesky: FaBluesky, linkedin: FaLinkedin, instagram: FaInstagram, whatsapp: FaWhatsapp, facebook: FaFacebook,
  telegram: FaTelegram, reddit: FaReddit, threads: FaThreads, x: FaXTwitter, email: FaEnvelope,
}

const iconClass = 'flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-[#A9A8E9]/50'

/**
 * Every way of sharing, always visible in a row (the pill page shows it right under the content).
 * Same networks, order and behaviour as the share menu (ShareButton).
 */
export function ShareBar({ title, url }: { title: string; url: string }) {
  const t = useTranslations('share')
  const [message, setMessage] = useState<string | null>(null)
  const shareUrl = cleanShareUrl(url)

  const copy = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      return true
    } catch {
      return false
    }
  }
  const flash = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), 6000)
  }
  const shareOnInstagram = async () => {
    if (typeof navigator.share === 'function' && window.matchMedia?.('(pointer: coarse)')?.matches) {
      void navigator.share({ title, url: shareUrl }).catch(() => {})
      return
    }
    window.open(INSTAGRAM_URL, '_blank', 'noopener,noreferrer')
    if (await copy()) flash(t('instagramHint'))
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{t('dialog')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {shareLinks({ url: shareUrl, title, emailLabel: t('email') }).map(({ id, label, href }) => {
          const Icon = ICONS[id]
          return href === null ? (
            <button key={id} type="button" onClick={shareOnInstagram} className={iconClass} aria-label={label} title={label}>
              <Icon size={18} aria-hidden />
            </button>
          ) : (
            <a key={id} href={href} target={id === 'email' ? undefined : '_blank'} rel="noopener noreferrer" className={iconClass} aria-label={label} title={label}>
              <Icon size={18} aria-hidden />
            </a>
          )
        })}
        <button
          type="button"
          onClick={async () => { if (await copy()) flash(t('copied')) }}
          className={iconClass}
          aria-label={t('copyLink')}
          title={t('copyLink')}
        >
          <FaLink size={16} aria-hidden />
        </button>
      </div>
      {message && <p className="text-xs leading-snug text-muted-foreground" role="status">{message}</p>}
    </div>
  )
}
