'use client'
import { useRef, useState } from 'react'
import { BookOpen, FileText, Mic, Video, Zap } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { languageLabel } from '@/lib/language-availability'
import { Link } from '@/i18n/navigation'
import type { ContentType } from '@/lib/supabase/types'
import { BookmarkButton } from '@/components/social/BookmarkButton'
import { AUTO_COVER_COLORS, readableTextColor } from '@/lib/cover-formats'

const TYPE_PATHS: Record<ContentType, string> = {
  article: 'articles',
  video: 'videos',
  podcast: 'podcasts',
  pill: 'pills',
  course: 'courses',
}

interface ContentCardProps {
  contentId: string
  type: ContentType
  slug: string
  title: string
  excerpt?: string | null
  description?: string | null
  coverImageUrl?: string | null
  thumbnailUrl?: string | null
  publishedAt?: string | null
  likesCount?: number
  authorName?: string | null
  authorSlug?: string | null
  authorAvatarUrl?: string | null
  categoryTag?: string | null
  categoryTagSlug?: string | null
  readTimeMinutes?: number | null
  isBookmarked?: boolean
  isLoggedIn?: boolean
  isFeatured?: boolean
  /** Content that only exists in its original language (never auto-translated) */
  singleLanguage?: boolean
  sourceLocale?: string | null
  subtitleLocales?: string[] | null
  duration?: string | null
  episodeNumber?: string | null
  accentColor?: string | null
  rating?: number | null
  price?: number | null
  currency?: string | null
}

const TYPE_ICONS = { article: FileText, video: Video, podcast: Mic, pill: Zap, course: BookOpen } as const

// Shown when an item has no cover image: a designed card (colour, icon and kind of content), so nothing looks
// empty. The title is not repeated: it is right below, in the card.
function AutoCover({ type, label, accentColor }: { type: ContentType; label: string; accentColor?: string | null }) {
  const Icon = TYPE_ICONS[type]
  const background = (type === 'pill' && accentColor) || AUTO_COVER_COLORS[type] || '#000000'
  const color = readableTextColor(background)
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2" style={{ background, color }} data-auto-cover>
      <Icon size={46} strokeWidth={1.3} aria-hidden />
      <span className="text-xs uppercase tracking-[0.12em]" style={{ fontFamily: 'JetBrains Mono, monospace', opacity: 0.75 }}>
        {label}
      </span>
    </div>
  )
}

function AuthorAvatar({ name, avatarUrl, slug }: { name?: string | null; avatarUrl?: string | null; slug?: string | null }) {
  // A broken photo link falls back to the initial instead of a broken-image icon
  const [failed, setFailed] = useState(false)
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  const avatar =
    avatarUrl && !failed ? (
      <img
        src={avatarUrl}
        alt={name ?? ''}
        onError={() => setFailed(true)}
        className="rounded-full object-cover object-top shrink-0"
        style={{ width: 32, height: 32, border: '1.5px solid rgba(212,165,116,0.6)' }}
      />
    ) : (
      <span
        className="rounded-full shrink-0 flex items-center justify-center text-white text-xs font-semibold"
        style={{
          width: 32,
          height: 32,
          background: '#8b4513',
          fontFamily: 'JetBrains Mono, monospace',
          border: '1.5px solid rgba(212,165,116,0.6)',
        }}
      >
        {initial}
      </span>
    )
  // With a profile, the photo leads to the creator's page just like the name does
  return slug ? (
    <Link href={`/author/${slug}`} aria-label={name ?? undefined} className="shrink-0 rounded-full">
      {avatar}
    </Link>
  ) : (
    avatar
  )
}

export function ContentCard({
  contentId,
  type,
  slug,
  title,
  excerpt,
  description,
  coverImageUrl,
  thumbnailUrl,
  publishedAt,
  likesCount,
  authorName,
  authorSlug,
  authorAvatarUrl,
  categoryTag,
  categoryTagSlug,
  readTimeMinutes,
  isBookmarked = false,
  isLoggedIn = false,
  isFeatured = false,
  singleLanguage = false,
  sourceLocale,
  subtitleLocales,
  duration,
  episodeNumber,
  accentColor,
  rating,
  price,
  currency,
}: ContentCardProps) {
  const tContent = useTranslations('content')
  const tCreate = useTranslations('create')
  const uiLocale = useLocale()
  const href = `/${TYPE_PATHS[type]}/${slug}`
  const blurb = excerpt ?? description
  const image = coverImageUrl ?? thumbnailUrl

  const cardRef = useRef<HTMLElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotX = (y - 0.5) * -10
    const rotY = (x - 0.5) * 10
    const shadowX = rotY * -1.2
    const shadowY = rotX * 1.2 + 8
    el.style.transition = 'transform 0.06s linear, box-shadow 0.06s linear'
    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`
    el.style.boxShadow = `${shadowX}px ${shadowY}px 28px rgba(44,36,32,0.18), 0px 2px 8px rgba(93,78,55,0.1)`
  }

  const handleMouseLeave = () => {
    const el = cardRef.current
    if (!el) return
    el.style.transition = 'transform 0.55s cubic-bezier(0.23,1,0.32,1), box-shadow 0.55s cubic-bezier(0.23,1,0.32,1)'
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)'
    el.style.boxShadow = '0px 2px 8px rgba(93,78,55,0.1)'
  }

  return (
    <article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group flex flex-col overflow-hidden"
      style={{
        background: '#fdfcfa',
        border: '1px solid #d4a574',
        borderRadius: 16,
        boxShadow: '0px 2px 8px rgba(93,78,55,0.1)',
        willChange: 'transform',
      }}
    >
      {/* Cover image */}
      <div className="relative overflow-hidden shrink-0" style={{ aspectRatio: '16 / 9' }}>
        <Link href={href} className="block h-full">
          {image ? (
            type === 'podcast' ? (
              // podcast covers are square: shown whole, centred in the card's frame
              <div className="flex h-full w-full items-center justify-center" style={{ background: 'rgba(139,115,85,0.18)' }}>
                <img
                  src={image}
                  alt={title}
                  className="h-full aspect-square object-cover transition-transform duration-700 ease-in-out group-hover:scale-[1.04]"
                  loading="lazy"
                />
              </div>
            ) : type === 'pill' ? (
              // pill images can have any shape: shown whole, never cropped
              <div className="flex h-full w-full items-center justify-center" style={{ background: `${accentColor || '#8b7355'}22` }}>
                <img
                  src={image}
                  alt={title}
                  className="max-h-full max-w-full object-contain transition-transform duration-700 ease-in-out group-hover:scale-[1.04]"
                  loading="lazy"
                />
              </div>
            ) : (
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-[1.06]"
                loading="lazy"
              />
            )
          ) : (
            <AutoCover type={type} label={tCreate(type)} accentColor={accentColor} />
          )}
          {/* Gradient overlay (only over a photo: an automatic card is already designed) */}
          {image && (
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(44,36,32,0.6) 0%, rgba(44,36,32,0.1) 50%, rgba(0,0,0,0) 100%)',
              }}
            />
          )}
          {/* Play button overlay for videos */}
          {type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="flex items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
                style={{
                  width: 52,
                  height: 52,
                  background: 'rgba(184,115,79,0.95)',
                  boxShadow: '0 4px 16px rgba(44,36,32,0.3)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M7 5l9 5-9 5V5z" fill="#fff" />
                </svg>
              </div>
            </div>
          )}
          {/* Duration badge for video/podcast */}
          {duration && (
            <span
              className="absolute bottom-[12px] right-[12px] text-xs px-2 py-0.5 rounded"
              style={{
                background: 'rgba(44,36,32,0.75)',
                color: '#F5F1E8',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
              }}
            >
              {duration}
            </span>
          )}
          {/* Shine sweep on hover */}
          <div className="card-image-shine" />
        </Link>

        {/* Category / type badge — top left */}
        {categoryTag && categoryTagSlug ? (
          <Link
            href={`/tag/${categoryTagSlug}`}
            className="absolute top-[15px] left-[16px] text-xs px-3 py-1 rounded-full hover:opacity-80 transition-opacity"
            style={{
              background: 'rgba(253,252,250,0.9)',
              border: '1px solid rgba(212,165,116,0.3)',
              color: '#5d4e37',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {categoryTag}
          </Link>
        ) : (
          <span
            className="absolute top-[15px] left-[16px] text-xs px-3 py-1 rounded-full"
            style={{
              background: 'rgba(253,252,250,0.9)',
              border: '1px solid rgba(212,165,116,0.3)',
              color: '#5d4e37',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
            }}
          >
            {categoryTag ?? tCreate(type)}
          </span>
        )}

        {/* Featured star */}
        {isFeatured && (
          <span
            className="absolute top-[15px] right-[16px] text-base"
            style={{ color: '#F5C518', textShadow: '0 1px 2px rgba(0,0,0,0.4)', lineHeight: 1 }}
            title={tContent('featured')}
          >
            ★
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 flex-1 px-6 pt-6">
        {/* Language availability — shown on content that only exists in one language */}
        {singleLanguage && sourceLocale && (
          <span
            className="self-start rounded-full px-2.5 py-0.5 text-[11px] text-[#5d4e37]"
            style={{ background: 'rgba(212,165,116,0.18)', fontFamily: 'JetBrains Mono, monospace' }}
          >
            🌐 {languageLabel(tContent, uiLocale, { sourceLocale, subtitleLocales })}
          </span>
        )}

        {/* Episode / duration (non-article) */}
        {(episodeNumber || duration || rating != null) && (
          <div className="flex items-center gap-2 text-xs text-[#8b7355]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {episodeNumber && <span>{tContent('episode')} {episodeNumber}</span>}
            {duration && <span>{duration}</span>}
            {rating != null && <span>★ {rating.toFixed(1)}</span>}
          </div>
        )}

        {/* Title */}
        <h3
          className="leading-[1.3] line-clamp-2"
          style={{
            fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
            fontSize: 18,
            color: '#5d4e37',
            lineHeight: '23.4px',
          }}
        >
          <Link href={href} className="hover:text-primary transition-colors">
            {title}
          </Link>
        </h3>

        {/* Excerpt */}
        {blurb && (
          <p
            className="text-sm line-clamp-2 leading-[1.7]"
            style={{ color: '#6b5744', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
          >
            {blurb}
          </p>
        )}

        {/* Price (courses) */}
        {price != null && (
          <p
            className="text-sm font-semibold"
            style={{ color: '#a0522d', fontFamily: 'JetBrains Mono, monospace' }}
          >
            {price === 0 ? tContent('freeLabel') : currency ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price) : String(price)}
          </p>
        )}
      </div>

      {/* Footer section */}
      <div
        className="px-6 pt-4 pb-5 mt-3 flex flex-col gap-3"
        style={{ borderTop: '1px solid #d4a574' }}
      >
        {/* Author + read time */}
        {authorName && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} slug={authorSlug} />
              <div className="flex flex-col gap-1 min-w-0">
                <Link
                  href={authorSlug ? `/author/${authorSlug}` : '#'}
                  className="text-sm font-medium text-[#5d4e37] hover:text-primary truncate transition-colors"
                  style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
                >
                  {authorName}
                </Link>
              </div>
            </div>
            {readTimeMinutes && type === 'article' && (
              <div className="flex items-center gap-1.5 shrink-0 text-[#8b7355] text-sm" style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span>{tContent('readTime', { minutes: readTimeMinutes })}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions: like count + bookmark */}
        <div className="flex items-center gap-3">
          <span
            className="text-xs flex items-center gap-1"
            style={{ color: '#8b7355', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M8 13.5S2 9.8 2 5.5a3 3 0 015.5-1.6A3 3 0 0114 5.5C14 9.8 8 13.5 8 13.5z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {likesCount ?? 0}
          </span>
          <BookmarkButton
            contentId={contentId}
            initialIsBookmarked={isBookmarked}
            isLoggedIn={isLoggedIn}
          />
        </div>
      </div>
    </article>
  )
}
