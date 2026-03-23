'use client'

import { useEffect, useRef, useState } from 'react'
import { ArticleBody } from './ArticleBody'
import { TranscriptPanel } from './TranscriptPanel'
import type { TranscriptCue } from '@/lib/transcript'

interface VideoChapter {
  timestamp: string
  title: string
}

interface VideoTranslationLoaderProps {
  // Description
  body: unknown | null
  englishBody: unknown | null
  legacyDescription: string | null
  // Chapters
  chapters: VideoChapter[]
  translatedChapters: VideoChapter[] | null
  // Transcript
  transcript: TranscriptCue[]
  translatedTranscript: TranscriptCue[] | null
  // What needs translation
  needsBody: boolean
  needsChapters: boolean
  needsTranscript: boolean
  // For polling
  contentId: string
  locale: string
}

const MAX_ATTEMPTS = 10
const POLL_INTERVAL_MS = 4000

function TranslatingBadge() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-['JetBrains_Mono',monospace] w-fit">
      <span className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin" />
      Translating
    </div>
  )
}

function DescriptionSkeleton() {
  return (
    <div className="bg-card border border-primary/20 rounded-2xl p-6 mb-4 animate-pulse">
      <div className="h-6 w-36 bg-primary/10 rounded mb-4" />
      <div className="space-y-2">
        <div className="h-4 bg-primary/10 rounded w-full" />
        <div className="h-4 bg-primary/10 rounded w-[85%]" />
        <div className="h-4 bg-primary/10 rounded w-[70%]" />
      </div>
    </div>
  )
}

export function VideoTranslationLoader({
  body: initialBody,
  englishBody,
  legacyDescription,
  chapters,
  translatedChapters: initialTranslatedChapters,
  transcript,
  translatedTranscript: initialTranslatedTranscript,
  needsBody,
  needsChapters,
  needsTranscript,
  contentId,
  locale,
}: VideoTranslationLoaderProps) {
  const [body, setBody] = useState(initialBody)
  const [translatedChapters, setTranslatedChapters] = useState(initialTranslatedChapters)
  const [translatedTranscript, setTranslatedTranscript] = useState(initialTranslatedTranscript)

  const isTranslating = needsBody || needsChapters || needsTranscript
  const stillWaiting = useRef({ body: needsBody, chapters: needsChapters, transcript: needsTranscript })
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!isTranslating) return

    attemptsRef.current = 0

    const interval = setInterval(async () => {
      attemptsRef.current += 1

      try {
        const res = await fetch(`/api/translation-status?contentId=${contentId}&locale=${locale}`)
        const data = await res.json()

        if (stillWaiting.current.body && data.body != null) {
          setBody(data.body)
          stillWaiting.current.body = false
        }
        if (stillWaiting.current.chapters && Array.isArray(data.chapters) && data.chapters.length > 0) {
          setTranslatedChapters(data.chapters as VideoChapter[])
          stillWaiting.current.chapters = false
        }
        if (stillWaiting.current.transcript && Array.isArray(data.transcript) && data.transcript.length > 0) {
          setTranslatedTranscript(data.transcript as TranscriptCue[])
          stillWaiting.current.transcript = false
        }

        const allDone = !stillWaiting.current.body && !stillWaiting.current.chapters && !stillWaiting.current.transcript
        if (allDone || attemptsRef.current >= MAX_ATTEMPTS) {
          clearInterval(interval)
        }
      } catch {
        // Network error — keep polling
        if (attemptsRef.current >= MAX_ATTEMPTS) clearInterval(interval)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isTranslating, contentId, locale])

  const displayBody = body
  const displayChapters = translatedChapters ?? (needsChapters ? null : chapters)
  const displayTranscript = translatedTranscript ?? (needsTranscript ? null : transcript.length > 0 ? transcript : null)

  return (
    <>
      {/* Description card */}
      {needsBody && !displayBody ? (
        <DescriptionSkeleton />
      ) : (displayBody || legacyDescription) ? (
        <div className="bg-card border border-primary/20 rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-['Audiowide'] text-2xl uppercase text-foreground">Description</h3>
            {needsBody && !displayBody && <TranslatingBadge />}
          </div>
          <div className="text-[#5a4a42] text-base leading-[1.625]">
            {displayBody ? (
              <ArticleBody json={displayBody as Record<string, unknown> | unknown[]} />
            ) : (
              <p className="leading-[1.625]">{legacyDescription}</p>
            )}
          </div>
        </div>
      ) : englishBody ? (
        <div className="bg-card border border-primary/20 rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-['Audiowide'] text-2xl uppercase text-foreground">Description</h3>
            <TranslatingBadge />
          </div>
          <div className="text-[#5a4a42] text-base leading-[1.625]">
            <ArticleBody json={englishBody as Record<string, unknown> | unknown[]} />
          </div>
        </div>
      ) : null}

      {/* Chapters card */}
      {chapters.length > 0 && (
        <div className="bg-card border border-primary/20 rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-['Audiowide'] text-2xl uppercase text-foreground">Chapters</h3>
            {needsChapters && !translatedChapters && <TranslatingBadge />}
          </div>
          <div className="flex flex-col gap-1">
            {(displayChapters ?? chapters).map((ch, i) => (
              <div
                key={i}
                className="flex items-start gap-4 px-3 py-3 rounded-[10px] hover:bg-primary/5 transition-colors"
              >
                <span
                  className="font-semibold text-primary text-sm tracking-[0.28px] w-14 flex-shrink-0 mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {ch.timestamp}
                </span>
                <span
                  className="text-sm text-[#5a4a42] tracking-[0.28px]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {ch.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcript panel */}
      {(displayTranscript || (needsTranscript && transcript.length > 0)) && (
        <div className="relative">
          {needsTranscript && !translatedTranscript && (
            <div className="absolute top-[10px] right-[10px] z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-['JetBrains_Mono',monospace]">
              <span className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin" />
              Translating
            </div>
          )}
          <TranscriptPanel transcript={displayTranscript ?? transcript} />
        </div>
      )}
    </>
  )
}
