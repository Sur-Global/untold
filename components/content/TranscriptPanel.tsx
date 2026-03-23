'use client'

import { useState } from 'react'
import type { TranscriptCue } from '@/lib/transcript'

interface TranscriptPanelProps {
  transcript: TranscriptCue[]
}

export function TranscriptPanel({ transcript }: TranscriptPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-card border border-primary/20 rounded-2xl mb-8 overflow-hidden">
      {/* Trigger row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 h-[55px] flex items-center justify-between hover:bg-primary/5 transition-colors"
        aria-expanded={open}
      >
        <span
          className="font-medium text-sm tracking-[0.28px] text-foreground"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          View full transcript
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          className="transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'none' }}
        >
          <path
            d="M5 10h10M10 5l5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Expandable content */}
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '24rem' : '0' }}
      >
        <div className="overflow-y-auto max-h-96 px-5 pb-5">
          <div className="flex flex-col gap-1 pt-2">
            {transcript.map((cue, i) => (
              <div key={i} className="flex items-start gap-4 px-3 py-2 rounded-[10px] hover:bg-primary/5 transition-colors">
                <span
                  className="font-semibold text-primary text-sm tracking-[0.28px] w-14 flex-shrink-0 mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {cue.start}
                </span>
                <span className="text-sm text-[#5a4a42] tracking-[0.28px] leading-[1.5]">
                  {cue.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
