'use client'

import { useEffect, useRef, useState } from 'react'
import { TranscriptPanel } from './TranscriptPanel'
import type { TranscriptCue } from '@/lib/transcript'

interface TranscriptLoaderProps {
  transcript: TranscriptCue[]
  isTranslating: boolean
  contentId: string
  locale: string
}

const MAX_ATTEMPTS = 10
const POLL_INTERVAL_MS = 4000

export function TranscriptLoader({ transcript, isTranslating, contentId, locale }: TranscriptLoaderProps) {
  const [displayTranscript, setDisplayTranscript] = useState<TranscriptCue[]>(transcript)
  const [translating, setTranslating] = useState(isTranslating)
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!isTranslating) return

    attemptsRef.current = 0

    const interval = setInterval(async () => {
      attemptsRef.current += 1

      try {
        const res = await fetch(`/api/transcript?contentId=${contentId}&locale=${locale}`)
        const data = await res.json()
        if (Array.isArray(data.transcript) && data.transcript.length > 0) {
          setDisplayTranscript(data.transcript as TranscriptCue[])
          setTranslating(false)
          clearInterval(interval)
          return
        }
      } catch {
        // Network error — keep polling
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        clearInterval(interval)
        setTranslating(false)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isTranslating, contentId, locale])

  return (
    <div className="relative">
      {translating && (
        <div className="absolute top-[10px] right-[10px] z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-['JetBrains_Mono',monospace]">
          <span className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin" />
          Translating
        </div>
      )}
      <TranscriptPanel transcript={displayTranscript} />
    </div>
  )
}
