'use client'

import { Link } from '@/i18n/navigation'
import { readableTextColor } from '@/lib/cover-formats'
import type { PillSlide } from '@/lib/pill-slides'
import { SlideView } from '@/components/pills/SlideView'

/**
 * The picture of a knowledge pill in a card: its first slide as it was designed (the title over the photo, 4:5 like on
 * Instagram), the whole card a link to the pill. A pill without a designed slide (a text pill) shows its title over its
 * picture on a shade that keeps it readable, or on its brand colour when it has no picture.
 */
export function PillCover({ slug, title, coverImageUrl, coverSlide, accentColor, className = '' }: {
  slug: string
  title: string
  coverImageUrl?: string | null
  /** The first slide of a carousel pill with the title as its text (see coverSlideFor) */
  coverSlide?: PillSlide | null
  accentColor?: string | null
  className?: string
}) {
  const frameColor = accentColor || '#8b7355'
  return (
    <Link
      href={`/pills/${slug}`}
      aria-label={title}
      className={`relative block overflow-hidden rounded-xl ${className}`}
      style={{ aspectRatio: '4 / 5', background: frameColor, boxShadow: '0 2px 8px rgba(93,78,55,0.12)', textDecoration: 'none' }}
    >
      {coverSlide ? (
        <SlideView slide={coverSlide} />
      ) : (
        <>
          {coverImageUrl && <img src={coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
          {coverImageUrl && <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))' }} />}
          <span
            className="absolute inset-x-0 bottom-0 p-4 text-xl leading-tight"
            style={{
              fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: coverImageUrl ? '#fff' : readableTextColor(frameColor),
              ...(coverImageUrl ? { textShadow: '0 1px 6px rgba(0,0,0,0.45)' } : {}),
            }}
          >
            {title}
          </span>
        </>
      )}
    </Link>
  )
}
