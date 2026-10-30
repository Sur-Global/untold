'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { languageLabel } from '@/lib/language-availability'
import { AuthorAvatar } from '@/components/content/AuthorAvatar'
import { BookmarkButton } from '@/components/social/BookmarkButton'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

export interface CourseCardProps {
  slug: string
  title: string
  excerpt?: string | null
  coverImageUrl?: string | null
  /** the banner already carries the title: the card does not repeat it (read by screen readers only) */
  bannerHasTitle?: boolean
  price?: number | null
  currency?: string | null
  rating?: number | null
  /** "12 weeks · Live classes on Saturdays" */
  duration?: string | null
  studentsCount?: number | null
  authorName?: string | null
  authorSlug?: string | null
  authorAvatarUrl?: string | null
  singleLanguage?: boolean
  sourceLocale?: string | null
  subtitleLocales?: string[] | null
  /** the course's topic, linking to its page */
  topic?: { label: string; slug: string } | null
  /** likes and bookmark, for the listing page */
  bookmark?: { contentId: string; likesCount: number; isBookmarked: boolean; isLoggedIn: boolean }
  /** `wide`: a single course across the whole row, with the banner beside the text */
  variant?: 'card' | 'wide'
}

function formatPrice(price: number, currency: string | null | undefined, locale: string, freeLabel: string): string {
  if (price === 0) return freeLabel
  if (!currency) return String(price)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    }).format(price)
  } catch {
    return `${currency} ${price}`
  }
}

/**
 * A course in a row of courses. The banner is shown whole, in its own 16:9 frame, with nothing on top of it (no price, no badge,
 * no shade): the banners are designed pieces with text and logos up to their edges. The price and the facts go below it.
 * Without a banner the frame is a brand-lime block carrying the title.
 */
export function CourseCard({
  slug,
  title,
  excerpt,
  coverImageUrl,
  bannerHasTitle = false,
  price,
  currency,
  rating,
  duration,
  studentsCount,
  authorName,
  authorSlug,
  authorAvatarUrl,
  singleLanguage = false,
  sourceLocale,
  subtitleLocales,
  topic,
  bookmark,
  variant = 'card',
}: CourseCardProps) {
  const t = useTranslations('content')
  const locale = useLocale()
  const href = `/courses/${slug}`
  const wide = variant === 'wide'
  // The title is already on the picture: either the banner has it, or the lime block that stands in for a banner shows it
  const titleOnPicture = !coverImageUrl || bannerHasTitle
  const priceLabel = price == null ? null : formatPrice(price, currency, locale, t('freeLabel'))
  const hasStudents = studentsCount != null && studentsCount > 0

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl ${wide ? 'lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}`}
      style={{ background: '#F8F8F8', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 8px rgba(93,78,55,0.1)' }}
    >
      <Link
        href={href}
        // with the title only on the picture, this link is the one that names the course; otherwise the title below is
        {...(titleOnPicture ? { 'aria-label': title } : { 'aria-hidden': true, tabIndex: -1 })}
        className={`block shrink-0 rounded-sm outline-offset-[-3px] focus-visible:outline-2 focus-visible:outline-[#0A0A0A] ${wide ? 'lg:self-center' : ''}`}
        style={{ aspectRatio: '16 / 9', background: '#ECECEC', textDecoration: 'none' }}
      >
        {coverImageUrl ? (
          <img src={coverImageUrl} alt="" loading="lazy" decoding="async" className="block h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-end p-5 text-[#0A0A0A]" style={{ background: '#D2FE73', ...aeonik, fontWeight: 500, fontSize: wide ? 'clamp(1.5rem, 3vw, 2.4rem)' : 'clamp(1.15rem, 2vw, 1.5rem)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {title}
          </span>
        )}
      </Link>

      <div className={`flex flex-1 flex-col gap-3 ${wide ? 'p-6 lg:justify-center lg:gap-3 lg:p-7' : 'p-5'}`}>
        {((singleLanguage && sourceLocale) || topic) && (
          <div className="flex flex-wrap items-center gap-2">
            {topic && (
              <Link href={`/tag/${topic.slug}`} className="rounded-full border border-[#d4a574]/40 bg-white px-2.5 py-0.5 text-[11px] text-[#5d4e37] hover:opacity-80" style={{ ...aeonik, textDecoration: 'none' }}>
                {topic.label}
              </Link>
            )}
            {singleLanguage && sourceLocale && (
              <span className="rounded-full px-2.5 py-0.5 text-[11px] text-[#5d4e37]" style={{ background: 'rgba(212,165,116,0.18)', ...aeonik }}>
                🌐 {languageLabel(t, locale, { sourceLocale, subtitleLocales })}
              </span>
            )}
          </div>
        )}

        {titleOnPicture ? (
          <h3 className="sr-only">{title}</h3>
        ) : (
          <h3 className={`leading-snug ${wide ? 'text-2xl' : 'line-clamp-2 text-lg'}`} style={{ ...aeonik, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
            <Link href={href} className="transition-colors hover:text-primary">{title}</Link>
          </h3>
        )}

        {excerpt && (
          <p className={`text-sm leading-relaxed text-[#555] ${wide ? 'line-clamp-3' : 'line-clamp-2'}`} style={{ ...aeonik, fontWeight: 300 }}>
            {excerpt}
          </p>
        )}

        {(duration || rating != null || hasStudents) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#555]" style={aeonik}>
            {duration && <span>{duration}</span>}
            {rating != null && <span>★ {rating.toFixed(1)}</span>}
            {hasStudents && <span>{studentsCount!.toLocaleString(locale)}</span>}
          </div>
        )}

        {(priceLabel || wide) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {priceLabel ? (
              <span className={wide ? 'text-xl' : 'text-lg'} style={{ ...aeonik, fontWeight: 500, color: '#0A0A0A' }}>{priceLabel}</span>
            ) : <span />}
            {wide && (
              <Link
                href={href}
                className="inline-flex h-11 items-center rounded-full bg-[#0A0A0A] px-6 text-sm text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A]"
                style={{ ...aeonik, fontWeight: 500, textDecoration: 'none' }}
              >
                {t('viewCourse')}
              </Link>
            )}
          </div>
        )}

        {(authorName || bookmark) && (
          <div className={`flex flex-col gap-3 pt-3 ${wide ? '' : 'mt-auto'}`} style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            {authorName && (
              <div className="flex items-center gap-2.5">
                <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={30} slug={authorSlug} />
                <p className="min-w-0 truncate text-sm font-medium text-[#5d4e37]" style={aeonik}>{authorName}</p>
              </div>
            )}
            {bookmark && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-[#8b7355]" style={aeonik}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M8 13.5S2 9.8 2 5.5a3 3 0 015.5-1.6A3 3 0 0114 5.5C14 9.8 8 13.5 8 13.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {bookmark.likesCount}
                </span>
                <BookmarkButton contentId={bookmark.contentId} initialIsBookmarked={bookmark.isBookmarked} isLoggedIn={bookmark.isLoggedIn} />
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
