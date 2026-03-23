'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArticleBody } from './ArticleBody'

interface BodyTranslationLoaderProps {
  contentId: string
  locale: string
  isTranslating: boolean
  // 'body' for articles/pills (BlockNote JSON), 'description' for podcasts/courses (plain text)
  field: 'body' | 'description'
  // fallback English content to show after max attempts
  fallback?: unknown
  // initial content (may be null if not yet translated)
  initialContent?: unknown
  // server-pre-rendered HTML for the initial content (from ServerBlockNoteEditor.blocksToFullHTML)
  prerenderedHtml?: string
  // className applied to the description <p> tag (ignored for body)
  descriptionClassName?: string
  // author ID to include in polling (for author bio status)
  authorId?: string
  // when true, call router.refresh() after translation lands (so title/excerpt update too)
  fullPageRefreshOnComplete?: boolean
}

const MAX_ATTEMPTS = 10
const POLL_INTERVAL_MS = 4000

function nativeLanguageName(locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale
  } catch {
    return locale
  }
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-primary/10 rounded w-full" />
      <div className="h-4 bg-primary/10 rounded w-[92%]" />
      <div className="h-4 bg-primary/10 rounded w-[85%]" />
      <div className="h-4 bg-primary/10 rounded w-full" />
      <div className="h-4 bg-primary/10 rounded w-[78%]" />
      <div className="h-4 bg-primary/10 rounded w-[90%]" />
    </div>
  )
}

function renderContent(content: unknown, field: 'body' | 'description', descriptionClassName?: string) {
  if (field === 'body') {
    return <ArticleBody json={content as Record<string, unknown> | unknown[]} />
  }
  return <p className={descriptionClassName ?? 'text-muted-foreground leading-relaxed'}>{content as string}</p>
}

export function BodyTranslationLoader({
  contentId,
  locale,
  isTranslating,
  field,
  fallback,
  initialContent,
  prerenderedHtml,
  descriptionClassName,
  authorId,
  fullPageRefreshOnComplete,
}: BodyTranslationLoaderProps) {
  const t = useTranslations('translating')
  const [content, setContent] = useState<unknown>(initialContent ?? null)
  const [failed, setFailed] = useState(false)
  const attemptsRef = useRef(0)
  // Track whether content was updated via polling (vs. initial prop)
  const contentFromPollingRef = useRef(false)
  const router = useRouter()
  const language = nativeLanguageName(locale)

  useEffect(() => {
    if (!isTranslating || content != null) return

    attemptsRef.current = 0
    const authorParam = authorId ? `&authorId=${authorId}` : ''
    const interval = setInterval(async () => {
      attemptsRef.current += 1
      try {
        const res = await fetch(`/api/translation-status?contentId=${contentId}&locale=${locale}${authorParam}`)
        const data = await res.json()
        const value = data[field]
        if (value != null && (typeof value !== 'object' || Object.keys(value).length > 0)) {
          if (fullPageRefreshOnComplete) {
            clearInterval(interval)
            router.refresh()
            return
          }
          contentFromPollingRef.current = true
          setContent(value)
          clearInterval(interval)
          return
        }
      } catch {
        // keep polling
      }
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setFailed(true)
        clearInterval(interval)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isTranslating, contentId, locale, field, content, authorId, fullPageRefreshOnComplete, router])

  // Has content — render it
  if (content != null) {
    // Use server-pre-rendered HTML for initial content (better fidelity via ServerBlockNoteEditor)
    if (field === 'body' && prerenderedHtml && !contentFromPollingRef.current) {
      return <ArticleBody html={prerenderedHtml} />
    }
    return renderContent(content, field, descriptionClassName)
  }

  // Translation failed after max attempts — fall back to English
  if (failed && fallback != null) return renderContent(fallback, field, descriptionClassName)

  // Translation pending — show apology placeholder
  if (isTranslating) {
    return (
      <div className="bg-card border border-primary/20 rounded-2xl p-8 mb-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
            <div>
              <p className="font-['Audiowide'] text-sm uppercase text-foreground">
                {t('heading', { language })}
              </p>
              <p className="text-xs text-muted-foreground font-['JetBrains_Mono',monospace] mt-1">
                {t('bodyGeneric', { language })}
              </p>
            </div>
          </div>
          <Skeleton />
        </div>
      </div>
    )
  }

  return null
}
