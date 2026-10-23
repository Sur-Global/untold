'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PillSlide } from '@/lib/pill-slides'
import { SlideView } from '@/components/pills/SlideView'

/**
 * The slides of a carousel pill: swipe on a phone, arrows and dots, and the keyboard's left/right arrows.
 * Built on a scrolling row that snaps to each slide, so it works without scripts too.
 */
export function PillCarousel({ slides, label }: { slides: PillSlide[]; label: string }) {
  const t = useTranslations('content')
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const goTo = useCallback((n: number) => {
    const el = track.current
    if (!el) return
    const next = Math.max(0, Math.min(slides.length - 1, n))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setIndex(next)
  }, [slides.length])

  const onScroll = () => {
    const el = track.current
    if (el && el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1) }
  }

  if (slides.length === 0) return null
  const button = 'flex size-9 items-center justify-center rounded-full border border-black/15 bg-white text-black transition-colors hover:bg-black/5 disabled:opacity-30'

  return (
    <section role="group" aria-roledescription="carousel" aria-label={label} className="mx-auto w-full max-w-[440px]">
      <div
        ref={track}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#A9A8E9]"
        style={{ scrollbarWidth: 'none' }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={t('slideOf', { n: i + 1, total: slides.length })}
            className="w-full shrink-0 snap-center"
          >
            <SlideView slide={slide} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button type="button" className={button} onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={t('carouselPrev')}>
          <ChevronLeft size={18} aria-hidden />
        </button>
        <div className="flex items-center gap-1.5" aria-hidden>
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className="size-2 rounded-full transition-colors"
              style={{ background: i === index ? '#000' : 'rgba(0,0,0,0.2)' }}
            />
          ))}
        </div>
        <button type="button" className={button} onClick={() => goTo(index + 1)} disabled={index === slides.length - 1} aria-label={t('carouselNext')}>
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-black/50" aria-live="polite">{index + 1} / {slides.length}</p>
    </section>
  )
}
