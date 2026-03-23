'use client'

import { useEffect, useRef, useState } from 'react'
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
  // className applied to the description <p> tag (ignored for body)
  descriptionClassName?: string
}

const MAX_ATTEMPTS = 10
const POLL_INTERVAL_MS = 4000

const LOCALE_NAMES: Record<string, string> = {
  es: 'Spanish',
  pt: 'Portuguese',
  fr: 'French',
  de: 'German',
  da: 'Danish',
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
  descriptionClassName,
}: BodyTranslationLoaderProps) {
  const [content, setContent] = useState<unknown>(initialContent ?? null)
  const [failed, setFailed] = useState(false)
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!isTranslating || content != null) return

    attemptsRef.current = 0
    const interval = setInterval(async () => {
      attemptsRef.current += 1
      try {
        const res = await fetch(`/api/translation-status?contentId=${contentId}&locale=${locale}`)
        const data = await res.json()
        const value = data[field]
        if (value != null && (typeof value !== 'object' || Object.keys(value).length > 0)) {
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
  }, [isTranslating, contentId, locale, field, content])

  // Has content — render it
  if (content != null) return renderContent(content, field, descriptionClassName)

  // Translation failed after max attempts — fall back to English
  if (failed && fallback != null) return renderContent(fallback, field, descriptionClassName)

  // Translation pending — show apology placeholder
  if (isTranslating) {
    const languageName = LOCALE_NAMES[locale] ?? locale.toUpperCase()
    return (
      <div className="bg-card border border-primary/20 rounded-2xl p-8 mb-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
            <div>
              <p
                className="font-['Audiowide'] text-sm uppercase text-foreground"
              >
                Translating into {languageName}
              </p>
              <p className="text-xs text-muted-foreground font-['JetBrains_Mono',monospace] mt-1">
                We&apos;re translating this content for you. It&apos;ll be ready in just a moment — thank you for your patience.
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
