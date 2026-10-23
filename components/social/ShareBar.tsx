'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FaBluesky, FaDownload, FaEnvelope, FaFacebook, FaInstagram, FaLink, FaLinkedin, FaReddit, FaTelegram, FaThreads, FaWhatsapp, FaXTwitter } from 'react-icons/fa6'
import { cleanShareUrl, shareLinks, type ShareTarget } from '@/lib/share'
import { useSlideShare, type SlidesToShare } from '@/components/social/useSlideShare'

const ICONS: Record<ShareTarget, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  bluesky: FaBluesky, linkedin: FaLinkedin, instagram: FaInstagram, whatsapp: FaWhatsapp, facebook: FaFacebook,
  telegram: FaTelegram, reddit: FaReddit, threads: FaThreads, x: FaXTwitter, email: FaEnvelope,
}

const iconClass = 'flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-[#A9A8E9]/50'

/**
 * Every way of sharing, always visible in a row (the pill page shows it right under the content).
 * Same networks, order and behaviour as the share menu (ShareButton). A carousel pill (`slides`) also offers Instagram
 * and the download of its slides as pictures.
 */
export function ShareBar({ title, url, slides }: { title: string; url: string; slides?: SlidesToShare }) {
  const t = useTranslations('share')
  const [message, setMessage] = useState<string | null>(null)
  const shareUrl = cleanShareUrl(url)
  const slideShare = useSlideShare(slides, title)

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
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{t('dialog')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {shareLinks({ url: shareUrl, title, emailLabel: t('email'), instagram: !!slides }).map(({ id, label, href }) => {
          const Icon = ICONS[id]
          return href === null ? (
            <button key={id} type="button" onClick={slideShare.shareToInstagram} disabled={slideShare.busy} className={iconClass} aria-label={label} title={label}>
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
      {slides && (
        <button
          type="button"
          onClick={slideShare.download}
          disabled={slideShare.busy}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[#A9A8E9]/30 disabled:opacity-60"
        >
          <FaDownload size={14} aria-hidden />
          {slideShare.busy ? t('preparingSlides') : t('downloadSlides')}
        </button>
      )}
      {(slideShare.message ?? message) && <p className="text-xs leading-snug text-muted-foreground" role="status">{slideShare.message ?? message}</p>}
    </div>
  )
}
