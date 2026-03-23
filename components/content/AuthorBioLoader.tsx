'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

interface AuthorBioLoaderProps {
  initialBio: string | null
  needsTranslation: boolean
  contentId: string
  authorId: string
  locale: string
}

const MAX_ATTEMPTS = 10
const POLL_INTERVAL_MS = 4000

export function AuthorBioLoader({ initialBio, needsTranslation, contentId, authorId, locale }: AuthorBioLoaderProps) {
  const t = useTranslations('translating')
  const [bio, setBio] = useState<string | null>(initialBio)
  const [translating, setTranslating] = useState(needsTranslation && !initialBio)
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!translating) return

    attemptsRef.current = 0
    const interval = setInterval(async () => {
      attemptsRef.current += 1
      try {
        const res = await fetch(`/api/translation-status?contentId=${contentId}&locale=${locale}&authorId=${authorId}`)
        const data = await res.json()
        if (data.authorBio) {
          setBio(data.authorBio)
          setTranslating(false)
          clearInterval(interval)
          return
        }
      } catch {
        // keep polling
      }
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setTranslating(false)
        clearInterval(interval)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [translating, contentId, locale, authorId])

  if (!bio && !translating) return null

  return (
    <div className="relative">
      {translating && (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-['JetBrains_Mono',monospace] mb-1">
          <span className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin" />
          {t('bioBadge')}
        </span>
      )}
      {bio && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{bio}</p>
      )}
    </div>
  )
}
