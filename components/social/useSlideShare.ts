'use client'

import { useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { canSharePictures, downloadSlidesZip, fetchSlideFiles } from '@/lib/slide-download'

export type SlidesToShare = { slug: string; count: number }

/**
 * Sharing the slides of a carousel pill as pictures: download them all (a ZIP) or, on a phone, hand them to Instagram
 * (or any other app) from the device's share sheet. Instagram has no web address for sharing, so pictures are the way.
 */
export function useSlideShare(slides: SlidesToShare | undefined, title: string) {
  const t = useTranslations('share')
  const locale = useLocale()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // pictures already fetched when the phone did not let us open its share sheet after the wait: the next tap shares them
  const ready = useRef<File[] | null>(null)

  const flash = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(null), 8000)
  }

  const download = async (): Promise<boolean> => {
    if (!slides) return false
    setBusy(true)
    try {
      await downloadSlidesZip(slides.slug, locale)
      return true
    } catch {
      flash(t('slidesError'))
      return false
    } finally {
      setBusy(false)
    }
  }

  const shareToInstagram = async () => {
    if (!slides) return
    if (!canSharePictures()) {
      if (await download()) flash(t('instagramSlidesHint'))
      return
    }
    setBusy(true)
    let files = ready.current
    try {
      files ??= await fetchSlideFiles(slides.slug, locale, slides.count)
      ready.current = null
      await navigator.share({ files, title })
    } catch (err) {
      const name = (err as { name?: string }).name
      if (name === 'NotAllowedError' && files) {
        ready.current = files
        flash(t('slidesReady'))
      } else if (name !== 'AbortError') flash(t('slidesError'))
    } finally {
      setBusy(false)
    }
  }

  return { busy, message, download: async () => { await download() }, shareToInstagram }
}
