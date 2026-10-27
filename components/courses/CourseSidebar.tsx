'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { IntroSessionList } from '@/components/courses/CourseParts'
import type { IntroSession } from '@/lib/course-page'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

/** Where the registration box is compared with what the reader sees: still below, on screen, or already passed */
export type RegistrationPosition = 'before' | 'in' | 'after'

const REGISTRATION_ID = 'inscripcion'
/** the bar at the bottom of a phone is about this tall: the box counts as reached once it clears it */
const BAR_CLEARANCE = 72

export function useRegistrationPosition(): RegistrationPosition {
  const [position, setPosition] = useState<RegistrationPosition>('before')
  useEffect(() => {
    const target = document.getElementById(REGISTRATION_ID)
    if (!target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => setPosition(entry.isIntersecting ? 'in' : entry.boundingClientRect.top < 0 ? 'after' : 'before'),
      { rootMargin: `0px 0px -${BAR_CLEARANCE}px 0px` },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])
  return position
}

export type CourseSidebarProps = {
  price: string | null
  priceNote: string
  provider: ReactNode
  authorName?: string | null
  rating?: number | null
  registration: {
    sessions: { day: string; time: string; status: IntroSession['status'] }[]
    timezone: string
    href: string | null
    embedUrl: string | null
    label: string
  }
  labels: {
    price: string; free: string; provider: string; instructor: string; intro: string; rating: string
    status: Record<IntroSession['status'], string>
    enrollSoon: string; enrollSoonTitle: string
  }
}

/**
 * Price, who gives the course, the sessions and the button. The registration box in the page has the same sessions and button, so
 * only one of them is ever on screen: on a computer the card keeps following the reader and lets go of its button while the box
 * is in view; on a phone the card keeps only the price information and a bar at the bottom carries the price and the button until
 * the reader reaches the box.
 */
export function CourseSidebar({ price, priceNote, provider, authorName, rating, registration, labels }: CourseSidebarProps) {
  const position = useRegistrationPosition()
  const { sessions, timezone, href, embedUrl, label } = registration
  const buttonClass = 'flex h-12 w-full items-center justify-center rounded-full bg-black text-[15px] text-white transition-opacity hover:opacity-85'
  const buttonStyle = { ...aeonik, fontWeight: 500, textDecoration: 'none' }
  const barShown = position === 'before'

  return (
    <>
      <aside className="h-fit rounded-2xl p-6 lg:sticky lg:top-24" style={{ background: '#FAF7F2', border: '1px solid rgba(139,69,19,0.12)', boxShadow: '0 4px 16px rgba(44,36,32,0.08)' }}>
        <p className="text-xs uppercase tracking-[0.08em] text-[#6B5F58]" style={aeonik}>{labels.price}</p>
        <p className="mt-1 text-3xl" style={{ ...aeonik, fontWeight: 500, letterSpacing: '-0.02em' }}>{price ?? labels.free}</p>
        {priceNote && <p className="mt-1 text-sm text-[#6B5F58]" style={aeonik}>{priceNote}</p>}

        {(provider || authorName) && (
          <div className="mt-5 border-t border-black/10 pt-4 text-sm" style={aeonik}>
            <p className="text-xs uppercase tracking-[0.08em] text-[#6B5F58]">{provider ? labels.provider : labels.instructor}</p>
            <p className="mt-1 text-[15px] text-[#2c2420]">{provider ?? authorName}</p>
          </div>
        )}

        {/* the box in the page already lists them, and it is right there on a phone */}
        {sessions.length > 0 && (
          <div className="mt-5 hidden border-t border-black/10 pt-4 lg:block">
            <p className="mb-2 text-xs uppercase tracking-[0.08em] text-[#6B5F58]" style={aeonik}>{labels.intro}</p>
            <IntroSessionList sessions={sessions} statusLabels={labels.status} timezone={timezone} />
          </div>
        )}

        {/* with a form to go to: not on a phone (the bar has it) and not while the box is on screen (it has its own) */}
        {(!href || position !== 'in') && (
          <div className={`mt-6 ${href ? 'hidden lg:block' : ''}`}>
            {href ? (
              embedUrl ? (
                <a href={`#${REGISTRATION_ID}`} className={buttonClass} style={buttonStyle}>{label}</a>
              ) : (
                <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass} style={buttonStyle}>{label} ↗</a>
              )
            ) : (
              <button disabled className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-full bg-black/25 text-[15px] text-white/80" title={labels.enrollSoonTitle} style={aeonik}>
                {labels.enrollSoon}
              </button>
            )}
          </div>
        )}

        {rating != null && <p className="mt-4 text-sm text-[#6B5F58]" style={aeonik}>{labels.rating}: ★ {Number(rating).toFixed(1)}</p>}
      </aside>

      {href && (
        <div
          data-testid="course-register-bar"
          inert={!barShown}
          className={`fixed inset-x-0 bottom-0 z-30 border-t border-black/10 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[translate,opacity] duration-200 lg:hidden ${barShown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'}`}
          style={{ background: '#FAF7F2', boxShadow: '0 -4px 16px rgba(44,36,32,0.08)' }}
        >
          <div className="flex items-center gap-4" style={aeonik}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl leading-tight" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>{price ?? labels.free}</p>
              {priceNote && <p className="truncate text-xs text-[#6B5F58]">{priceNote}</p>}
            </div>
            {embedUrl ? (
              <a href={`#${REGISTRATION_ID}`} className="flex h-11 shrink-0 items-center justify-center rounded-full bg-black px-6 text-[15px] text-white transition-opacity hover:opacity-85" style={buttonStyle}>{label}</a>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer" className="flex h-11 shrink-0 items-center justify-center rounded-full bg-black px-6 text-[15px] text-white transition-opacity hover:opacity-85" style={buttonStyle}>{label} ↗</a>
            )}
          </div>
        </div>
      )}
    </>
  )
}
