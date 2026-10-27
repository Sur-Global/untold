'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { readableTextColor } from '@/lib/cover-formats'

// ─── Shared helpers ────────────────────────────────────────────────────────────

function AuthorAvatar({ name, avatarUrl, size = 32, slug }: { name?: string | null; avatarUrl?: string | null; size?: number; slug?: string | null }) {
  // A broken photo link falls back to the initial instead of a broken-image icon
  const [failed, setFailed] = useState(false)
  const avatar =
    avatarUrl && !failed ? (
      <img
        src={avatarUrl}
        alt={name ?? ''}
        onError={() => setFailed(true)}
        className="rounded-full object-cover object-top shrink-0"
        style={{ width: size, height: size, border: '1.5px solid rgba(169,168,233,0.4)' }}
      />
    ) : (
      <span
        className="rounded-full shrink-0 flex items-center justify-center text-white font-semibold"
        style={{
          width: size,
          height: size,
          background: '#A9A8E9',
          fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
          fontSize: size * 0.38,
          border: '1.5px solid rgba(212,165,116,0.6)',
        }}
      >
        {name?.charAt(0)?.toUpperCase() ?? '?'}
      </span>
    )
  // With a profile, the photo leads to the creator's page just like the name does
  return slug ? (
    <Link href={`/author/${slug}`} aria-label={name ?? undefined} className="shrink-0 rounded-full" style={{ textDecoration: 'none' }}>
      {avatar}
    </Link>
  ) : (
    avatar
  )
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="7" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function StudentsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 14c0-3 2-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// ─── LargeArticleCard ──────────────────────────────────────────────────────────

interface LargeArticleCardProps {
  slug: string
  title: string
  excerpt?: string | null
  coverImageUrl?: string | null
  authorName?: string | null
  authorSlug?: string | null
  authorAvatarUrl?: string | null
  categoryTag?: string | null
  categoryTagSlug?: string | null
  readTimeMinutes?: number | null
  isFeatured?: boolean
}

export function LargeArticleCard({
  slug,
  title,
  excerpt,
  coverImageUrl,
  authorName,
  authorSlug,
  authorAvatarUrl,
  categoryTag,
  categoryTagSlug,
  readTimeMinutes,
  isFeatured,
}: LargeArticleCardProps) {
  const tHome = useTranslations('home')
  const router = useRouter()
  return (
    <Link
      href={`/articles/${slug}`}
      className="relative flex flex-col rounded-2xl overflow-hidden md:flex-row"
      style={{
        background: '#2C2420',
        border: '1px solid rgba(0,0,0,0.08)',
        textDecoration: 'none',
        boxShadow: '0 4px 20px rgba(44,36,32,0.12)',
      }}
    >
      {/* Cover image — 16:9, so horizontal covers are barely cropped; on wide screens it sits beside the text */}
      <div className="relative w-full shrink-0 md:w-[58%] md:self-start" style={{ aspectRatio: '16 / 9', background: '#0A0A0A' }}>
        {coverImageUrl && (
          <img src={coverImageUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        )}

        {/* Top badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          {isFeatured && (
            <span
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: '#D2FE73',
                color: '#000',
                fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 400,
                fontSize: 11,
              }}
            >
              ★ {tHome('featuredBadge')}
            </span>
          )}
          {categoryTag && (
            categoryTagSlug ? (
              <button
                className="ml-auto px-3 py-1 rounded-full text-xs hover:opacity-80 transition-opacity"
                style={{
                  background: 'rgba(253,252,250,0.9)',
                  color: '#444',
                  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 400,
                  fontSize: 11,
                  border: 'none',
                  cursor: 'pointer',
                }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/tag/${categoryTagSlug}`) }}
              >
                {categoryTag}
              </button>
            ) : (
              <span
                className="ml-auto px-3 py-1 rounded-full text-xs"
                style={{
                  background: 'rgba(253,252,250,0.9)',
                  color: '#444',
                  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 400,
                  fontSize: 11,
                }}
              >
                {categoryTag}
              </span>
            )
          )}
        </div>
      </div>

      {/* Text panel: below the image on mobile, beside it on wide screens */}
      <div className="flex flex-1 flex-col justify-end p-6 md:justify-center md:p-8">
        <h3
          className="leading-snug line-clamp-4 mb-3"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 24,
            color: '#F5F1E8',
          }}
        >
          {title}
        </h3>

        {excerpt && (
          <p
            className="text-sm mb-5 line-clamp-3"
            style={{
              color: 'rgba(245,241,232,0.75)',
              fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
              lineHeight: 1.65,
            }}
          >
            {excerpt}
          </p>
        )}

        {/* Author row */}
        {authorName && (
          <div
            className="flex items-center justify-between pt-4"
            style={{ borderTop: '1px solid rgba(245,241,232,0.12)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={32} />
              <div className="min-w-0">
                <p
                  className="text-sm font-medium text-white truncate"
                  style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
                >
                  {authorName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {readTimeMinutes && (
                <div
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: 'rgba(245,241,232,0.65)', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
                >
                  <ClockIcon />
                  {readTimeMinutes} min
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}

// ─── VideoCard ─────────────────────────────────────────────────────────────────

interface VideoCardProps {
  slug: string
  title: string
  thumbnailUrl?: string | null
  coverImageUrl?: string | null
  duration?: string | null
  categoryTag?: string | null
  categoryTagSlug?: string | null
  authorName?: string | null
  authorSlug?: string | null
  authorAvatarUrl?: string | null
}

export function VideoCard({
  slug,
  title,
  thumbnailUrl,
  coverImageUrl,
  duration,
  categoryTag,
  categoryTagSlug,
  authorName,
  authorSlug,
  authorAvatarUrl,
}: VideoCardProps) {
  const image = thumbnailUrl ?? coverImageUrl
  const router = useRouter()

  return (
    <div>
      {/* Image tile */}
      <Link
        href={`/videos/${slug}`}
        className="relative block rounded-2xl overflow-hidden"
        style={{
          paddingBottom: '56.25%',
          background: '#0A0A0A',
          textDecoration: 'none',
        }}
      >
        {image ? (
          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: '#3a2f2a' }} />
        )}
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(44,36,32,0.45) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
          }}
        />
        {/* Category badge */}
        {categoryTag && (
          categoryTagSlug ? (
            <button
              className="absolute top-3 left-3 text-xs px-3 py-1 rounded-full hover:opacity-80 transition-opacity"
              style={{
                background: 'rgba(253,252,250,0.92)',
                color: '#444',
                fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 400,
                fontSize: 11,
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/tag/${categoryTagSlug}`) }}
            >
              {categoryTag}
            </button>
          ) : (
            <span
              className="absolute top-3 left-3 text-xs px-3 py-1 rounded-full"
              style={{
                background: 'rgba(253,252,250,0.92)',
                color: '#444',
                fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 400,
                fontSize: 11,
              }}
            >
              {categoryTag}
            </span>
          )
        )}
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 52,
              height: 52,
              background: '#A9A8E9',
              boxShadow: '0 4px 16px rgba(44,36,32,0.35)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M7 5l9 5-9 5V5z" fill="#fff" />
            </svg>
          </div>
        </div>
        {/* Duration badge */}
        {duration && (
          <span
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded text-xs"
            style={{
              background: 'rgba(44,36,32,0.78)',
              color: '#F5F1E8',
              fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 400,
              fontSize: 11,
            }}
          >
            <ClockIcon />
            {duration}
          </span>
        )}
      </Link>

      {/* Below image: title + meta */}
      <div className="mt-3 px-1">
        <Link href={`/videos/${slug}`} style={{ textDecoration: 'none' }}>
          <h3
            className="leading-snug line-clamp-2 mb-2 hover:text-primary transition-colors"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 16,
              color: '#2C2420',
              
            }}
          >
            {title}
          </h3>
        </Link>

        {authorName && (
          <div className="flex items-center gap-2 mb-2">
            <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={26} slug={authorSlug} />
            <div>
              <Link
                href={authorSlug ? `/author/${authorSlug}` : '#'}
                className="text-sm font-medium text-[#5d4e37]"
                style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', textDecoration: 'none' }}
              >
                {authorName}
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── PodcastCard ───────────────────────────────────────────────────────────────

interface PodcastCardProps {
  slug: string
  title: string
  excerpt?: string | null
  coverImageUrl?: string | null
  episodeNumber?: string | null
  duration?: string | null
  authorName?: string | null
  authorSlug?: string | null
  authorAvatarUrl?: string | null
}

export function PodcastCard({
  slug,
  title,
  excerpt,
  coverImageUrl,
  episodeNumber,
  duration,
  authorName,
  authorSlug,
  authorAvatarUrl,
}: PodcastCardProps) {
  const tContent = useTranslations('content')
  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: '#fff',
        border: '1.5px solid rgba(0,0,0,0.1)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Main content */}
      <Link
        href={`/podcasts/${slug}`}
        className="flex gap-4 p-5 flex-1"
        style={{ textDecoration: 'none' }}
      >
        {/* Square thumbnail */}
        <div
          className="shrink-0 rounded-xl overflow-hidden"
          style={{
            width: 100,
            height: 100,
            background: '#e8e0d8',
            border: '1px solid rgba(212,165,116,0.4)',
          }}
        >
          {coverImageUrl && (
            <img src={coverImageUrl} alt={title} className="w-full h-full object-cover" />
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {episodeNumber && (
            <p
              className="text-xs"
              style={{ color: '#666', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
            >
              {tContent('episode')} {episodeNumber}
            </p>
          )}
          <h3
            className="leading-snug line-clamp-2"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 16,
              color: '#2C2420',
              
            }}
          >
            {title}
          </h3>
          {excerpt && (
            <p
              className="text-sm line-clamp-2"
              style={{ color: '#555', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', lineHeight: 1.55 }}
            >
              {excerpt}
            </p>
          )}
          {duration && (
            <div
              className="flex items-center gap-1.5 text-xs mt-auto pt-1"
              style={{ color: '#666', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
            >
              <ClockIcon />
              {duration}
            </div>
          )}
        </div>
      </Link>

      {/* Footer: author */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}
      >
        <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={30} slug={authorSlug} />
        <div className="min-w-0">
          <Link
            href={authorSlug ? `/author/${authorSlug}` : '#'}
            className="text-sm font-medium text-[#5d4e37] truncate block"
            style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', textDecoration: 'none' }}
          >
            {authorName}
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── HomePillCard ──────────────────────────────────────────────────────────────

interface HomePillCardProps {
  slug: string
  title: string
  coverImageUrl?: string | null
  categoryTag?: string | null
  categoryTagSlug?: string | null
  accentColor?: string | null
  authorName?: string | null
  authorSlug?: string | null
  authorAvatarUrl?: string | null
}

/**
 * A knowledge pill on the home page: its slide whole, vertical (4:5, like on Instagram), with its topic on top and
 * its title and author below. Meant to sit in a PillsRail.
 */
export function HomePillCard({
  slug,
  title,
  coverImageUrl,
  categoryTag,
  categoryTagSlug,
  accentColor,
  authorName,
  authorSlug,
  authorAvatarUrl,
}: HomePillCardProps) {
  // The chip is the pill's brand colour, with the text colour that reads best on it
  const tagBg = accentColor ?? 'rgba(107,142,35,0.12)'
  const tagColor = accentColor ? readableTextColor(accentColor) : '#6B8E23'
  const tagBorder = accentColor ? 'rgba(0,0,0,0.12)' : 'rgba(107,142,35,0.25)'
  const chipStyle: React.CSSProperties = {
    background: tagBg,
    color: tagColor,
    border: `1px solid ${tagBorder}`,
    fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
    fontWeight: 400,
    fontSize: 11,
    textDecoration: 'none',
  }

  return (
    <article className="flex shrink-0 basis-[68%] snap-start flex-col sm:basis-[40%] md:basis-[30%] lg:basis-[calc((100%-60px)/4)]">
      {/* The slide, whole: 4:5 */}
      <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '4 / 5', background: accentColor || '#8b7355', boxShadow: '0 2px 8px rgba(93,78,55,0.12)' }}>
        <Link href={`/pills/${slug}`} tabIndex={-1} aria-hidden className="block h-full w-full" style={{ textDecoration: 'none' }}>
          {coverImageUrl ? (
            <img src={coverImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="flex h-full w-full items-center justify-center" style={{ color: readableTextColor(accentColor || '#8b7355') }}>
              <Zap size={40} aria-hidden />
            </span>
          )}
        </Link>
        {categoryTag &&
          (categoryTagSlug ? (
            <Link href={`/tag/${categoryTagSlug}`} className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs transition-opacity hover:opacity-80" style={chipStyle}>
              {categoryTag}
            </Link>
          ) : (
            <span className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs" style={chipStyle}>
              {categoryTag}
            </span>
          ))}
      </div>

      {/* Title and author */}
      <Link href={`/pills/${slug}`} style={{ textDecoration: 'none' }}>
        <h3
          className="mt-3 line-clamp-2 min-h-[2.75em] leading-snug transition-colors hover:text-primary"
          style={{ fontFamily: 'var(--font-heading)', fontSize: 15, color: '#2C2420' }}
        >
          {title}
        </h3>
      </Link>
      {authorName && (
        <div className="mt-2 flex items-center gap-2">
          <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={22} slug={authorSlug} />
          <Link
            href={authorSlug ? `/author/${authorSlug}` : '#'}
            className="block truncate text-[13px] text-[#5d4e37]"
            style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', textDecoration: 'none' }}
          >
            {authorName}
          </Link>
        </div>
      )}
    </article>
  )
}

/**
 * The pills of the home page in one row that slides (with the finger, or with the arrows where the row is longer than
 * the screen). The arrows only show when there is something to slide to.
 */
export function PillsRail({ children }: { children: React.ReactNode }) {
  const t = useTranslations('home')
  const rail = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const update = useCallback(() => {
    const el = rail.current
    if (!el) return
    setCanPrev(el.scrollLeft > 2)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    update()
    const el = rail.current
    const observer = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(update) : null
    if (el) observer?.observe(el)
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [update])

  const slide = (direction: 1 | -1) => {
    const el = rail.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' })
  }
  const arrow = 'flex size-9 items-center justify-center rounded-full border border-black/20 bg-white text-black transition-colors hover:bg-[#A9A8E9]/40 disabled:opacity-30 disabled:hover:bg-white'

  return (
    <div className="mt-6">
      <div
        ref={rail}
        onScroll={update}
        role="region"
        aria-label={t('pills')}
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A9A8E9] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {(canPrev || canNext) && (
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={arrow} disabled={!canPrev} onClick={() => slide(-1)} aria-label={t('railPrevious')}>
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button type="button" className={arrow} disabled={!canNext} onClick={() => slide(1)} aria-label={t('railNext')}>
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── CourseCard ────────────────────────────────────────────────────────────────

interface CourseCardProps {
  slug: string
  title: string
  excerpt?: string | null
  coverImageUrl?: string | null
  price?: number | null
  currency?: string | null
  rating?: number | null
  duration?: string | null
  studentsCount?: number | null
  authorName?: string | null
  authorSlug?: string | null
  authorAvatarUrl?: string | null
  viewProfileLabel?: string | null
}

export function CourseCard({
  slug,
  title,
  excerpt,
  coverImageUrl,
  price,
  currency,
  rating,
  duration,
  studentsCount,
  authorName,
  authorSlug,
  authorAvatarUrl,
  viewProfileLabel,
}: CourseCardProps) {
  const tAuthor = useTranslations('author')
  const priceLabel =
    price == null
      ? null
      : price === 0
      ? 'Free'
      : currency
      ? `${currency} ${price}`
      : `$${price}`

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: '#F8F8F8',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 2px 8px rgba(93,78,55,0.1)',
      }}
    >
      {/* Image area */}
      <Link
        href={`/courses/${slug}`}
        className="relative block shrink-0"
        style={{ height: 200, background: '#e8e0d8', textDecoration: 'none' }}
      >
        {coverImageUrl && (
          <img src={coverImageUrl} alt={title} className="w-full h-full object-cover" />
        )}
        {/* Subtle gradient */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(44,36,32,0.25) 0%, transparent 55%)' }}
        />

        {/* Price badge — top right */}
        {priceLabel && (
          <span
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-semibold"
            style={{
              background: '#000',
              fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 400,
              fontSize: 13,
            }}
          >
            <LockIcon />
            {priceLabel}
          </span>
        )}

        {/* Rating badge — bottom left */}
        {rating != null && (
          <span
            className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: 'rgba(245,241,232,0.96)',
              color: '#444',
              fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 400,
              boxShadow: '0 1px 4px rgba(44,36,32,0.15)',
            }}
          >
            ★ {rating.toFixed(1)}
          </span>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-col gap-2.5 flex-1 px-5 pt-5 pb-5">
        <Link href={`/courses/${slug}`} style={{ textDecoration: 'none' }}>
          <h3
            className="leading-snug line-clamp-2 hover:text-primary transition-colors"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 18,
              color: '#2C2420',
              
            }}
          >
            {title}
          </h3>
        </Link>

        {excerpt && (
          <p
            className="text-sm line-clamp-2"
            style={{ color: '#555', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', lineHeight: 1.6 }}
          >
            {excerpt}
          </p>
        )}

        {/* Duration + students */}
        {(duration || studentsCount != null) && (
          <div
            className="flex items-center gap-4 text-xs"
            style={{ color: '#666', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
          >
            {duration && (
              <span className="flex items-center gap-1.5">
                <ClockIcon />
                {duration}
              </span>
            )}
            {studentsCount != null && (
              <span className="flex items-center gap-1.5">
                <StudentsIcon />
                {studentsCount.toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* Author */}
        {authorName && (
          <div
            className="flex items-center gap-2.5 pt-3 mt-auto"
            style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}
          >
            <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={30} slug={authorSlug} />
            <div className="min-w-0">
              <p
                className="text-sm font-medium text-[#5d4e37] truncate"
                style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
              >
                {authorName}
              </p>
              {authorSlug && (
                <Link
                  href={`/author/${authorSlug}`}
                  className="text-xs hover:underline"
                  style={{
                    color: '#A9A8E9',
                    fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                    textDecoration: 'none',
                  }}
                >
                  {viewProfileLabel ?? tAuthor('viewProfile')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
