'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

const MAX_ATTEMPTS = 15
const POLL_INTERVAL_MS = 3000

interface PageTranslationPlaceholderProps {
  contentId: string
  locale: string
  coverImageUrl?: string | null
}

function nativeLanguageName(locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale
  } catch {
    return locale
  }
}

export function PageTranslationPlaceholder({ contentId, locale, coverImageUrl }: PageTranslationPlaceholderProps) {
  const t = useTranslations('translating')
  const router = useRouter()
  const attemptsRef = useRef(0)
  const language = nativeLanguageName(locale)

  useEffect(() => {
    const interval = setInterval(async () => {
      attemptsRef.current += 1
      try {
        const res = await fetch(`/api/translation-status?contentId=${contentId}&locale=${locale}`)
        const data = await res.json()
        const body = data.body
        if (body != null && (typeof body !== 'object' || Object.keys(body).length > 0)) {
          clearInterval(interval)
          router.refresh()
          return
        }
      } catch {
        // keep polling
      }
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        clearInterval(interval)
        router.refresh()
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [contentId, locale, router])

  return (
    <>
      {coverImageUrl && (
        <div className="rounded-2xl overflow-hidden shadow-[0px_4px_16px_0px_rgba(44,36,32,0.1),0px_8px_32px_0px_rgba(44,36,32,0.06)] mb-10" style={{ height: 500 }}>
          <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="bg-card border border-primary/20 rounded-2xl p-12 flex flex-col items-center gap-6 text-center">
        <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <div>
          <p className="font-['Audiowide'] text-lg uppercase text-foreground mb-2">
            {t('heading', { language })}
          </p>
          <p className="text-sm text-muted-foreground font-['JetBrains_Mono',monospace] max-w-sm">
            {t('bodyArticle', { language })}
          </p>
        </div>
      </div>
    </>
  )
}
