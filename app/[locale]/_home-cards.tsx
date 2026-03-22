'use client'
import { Link } from '@/i18n/navigation'
import { BookmarkButton } from '@/components/social/BookmarkButton'

// ─── Shared helpers ────────────────────────────────────────────────────────────

function AuthorAvatar({ name, avatarUrl, size = 32 }: { name?: string | null; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? ''}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, border: '1.5px solid rgba(212,165,116,0.6)' }}
      />
    )
  }
  return (
    <span
      className="rounded-full shrink-0 flex items-center justify-center text-white font-semibold"
      style={{
        width: size,
        height: size,
        background: '#8b4513',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: size * 0.38,
        border: '1.5px solid rgba(212,165,116,0.6)',
      }}
    >
      {name?.charAt(0)?.toUpperCase() ?? '?'}
    </span>
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

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 13.5S2 9.8 2 5.5a3 3 0 015.5-1.6A3 3 0 0114 5.5C14 9.8 8 13.5 8 13.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="12" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10.5 4.8L5.5 7.3M10.5 11.2L5.5 8.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
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
  likesCount?: number | null
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
  likesCount,
  isFeatured,
}: LargeArticleCardProps) {
  return (
    <Link
      href={`/articles/${slug}`}
      className="relative flex flex-col rounded-2xl overflow-hidden"
      style={{
        height: '100%',
        minHeight: 280,
        background: '#2C2420',
        border: '1px solid rgba(212,165,116,0.2)',
        textDecoration: 'none',
        boxShadow: '0 4px 20px rgba(44,36,32,0.12)',
      }}
    >
      {/* Background image */}
      {coverImageUrl && (
        <img
          src={coverImageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(44,36,32,0.97) 0%, rgba(44,36,32,0.55) 45%, rgba(0,0,0,0.12) 100%)',
        }}
      />

      {/* Top badges */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        {isFeatured && (
          <span
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: 'rgba(245,197,24,0.92)',
              color: '#2C2420',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
            }}
          >
            ★ FEATURED
          </span>
        )}
        {categoryTag && (
          categoryTagSlug ? (
            <Link
              href={`/tag/${categoryTagSlug}`}
              className="ml-auto px-3 py-1 rounded-full text-xs hover:opacity-80 transition-opacity"
              style={{
                background: 'rgba(253,252,250,0.9)',
                color: '#5d4e37',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                textDecoration: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {categoryTag}
            </Link>
          ) : (
            <span
              className="ml-auto px-3 py-1 rounded-full text-xs"
              style={{
                background: 'rgba(253,252,250,0.9)',
                color: '#5d4e37',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
              }}
            >
              {categoryTag}
            </span>
          )
        )}
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h3
          className="leading-snug line-clamp-3 mb-3"
          style={{
            fontFamily: 'Audiowide, sans-serif',
            fontSize: 22,
            color: '#F5F1E8',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </h3>

        {excerpt && (
          <p
            className="text-sm mb-5 line-clamp-2"
            style={{
              color: 'rgba(245,241,232,0.75)',
              fontFamily: 'Inter, sans-serif',
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
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {authorName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              {readTimeMinutes && (
                <div
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: 'rgba(245,241,232,0.65)', fontFamily: 'Inter, sans-serif' }}
                >
                  <ClockIcon />
                  {readTimeMinutes} min
                </div>
              )}
              {likesCount != null && (
                <div
                  className="flex items-center gap-1 text-xs"
                  style={{ color: 'rgba(245,241,232,0.55)', fontFamily: 'Inter, sans-serif' }}
                >
                  <HeartIcon />
                  {likesCount}
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
  likesCount?: number | null
  contentId: string
  isBookmarked?: boolean
  isLoggedIn?: boolean
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
  likesCount,
  contentId,
  isBookmarked = false,
  isLoggedIn = false,
}: VideoCardProps) {
  const image = thumbnailUrl ?? coverImageUrl

  return (
    <div>
      {/* Image tile */}
      <Link
        href={`/videos/${slug}`}
        className="relative block rounded-2xl overflow-hidden"
        style={{
          paddingBottom: '62.5%',
          background: '#2C2420',
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
            <Link
              href={`/tag/${categoryTagSlug}`}
              className="absolute top-3 left-3 text-xs px-3 py-1 rounded-full hover:opacity-80 transition-opacity"
              style={{
                background: 'rgba(253,252,250,0.92)',
                color: '#5d4e37',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                textDecoration: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {categoryTag}
            </Link>
          ) : (
            <span
              className="absolute top-3 left-3 text-xs px-3 py-1 rounded-full"
              style={{
                background: 'rgba(253,252,250,0.92)',
                color: '#5d4e37',
                fontFamily: 'JetBrains Mono, monospace',
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
              background: 'rgba(184,115,79,0.95)',
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
              fontFamily: 'JetBrains Mono, monospace',
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
              fontFamily: 'Audiowide, sans-serif',
              fontSize: 16,
              color: '#2C2420',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </h3>
        </Link>

        {authorName && (
          <div className="flex items-center gap-2 mb-2">
            <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={26} />
            <div>
              <Link
                href={authorSlug ? `/author/${authorSlug}` : '#'}
                className="text-sm font-medium text-[#5d4e37]"
                style={{ fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}
              >
                {authorName}
              </Link>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span
            className="flex items-center gap-1 text-xs"
            style={{ color: '#8B7355', fontFamily: 'Inter, sans-serif' }}
          >
            <HeartIcon />
            {likesCount ?? 0}
          </span>
          <BookmarkButton
            contentId={contentId}
            initialIsBookmarked={isBookmarked}
            isLoggedIn={isLoggedIn}
          />
        </div>
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
  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: '#fff',
        border: '1.5px solid rgba(160,82,45,0.22)',
        boxShadow: '0 2px 8px rgba(93,78,55,0.08)',
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
              style={{ color: '#8B7355', fontFamily: 'Inter, sans-serif' }}
            >
              Episode {episodeNumber}
            </p>
          )}
          <h3
            className="leading-snug line-clamp-2"
            style={{
              fontFamily: 'Audiowide, sans-serif',
              fontSize: 16,
              color: '#2C2420',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </h3>
          {excerpt && (
            <p
              className="text-sm line-clamp-2"
              style={{ color: '#6b5744', fontFamily: 'Inter, sans-serif', lineHeight: 1.55 }}
            >
              {excerpt}
            </p>
          )}
          {duration && (
            <div
              className="flex items-center gap-1.5 text-xs mt-auto pt-1"
              style={{ color: '#8B7355', fontFamily: 'Inter, sans-serif' }}
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
        style={{ borderTop: '1px solid rgba(212,165,116,0.25)' }}
      >
        <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={30} />
        <div className="min-w-0">
          <Link
            href={authorSlug ? `/author/${authorSlug}` : '#'}
            className="text-sm font-medium text-[#5d4e37] truncate block"
            style={{ fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}
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
  contentId: string
  slug: string
  title: string
  excerpt?: string | null
  coverImageUrl?: string | null
  categoryTag?: string | null
  categoryTagSlug?: string | null
  accentColor?: string | null
  authorName?: string | null
  authorSlug?: string | null
  authorAvatarUrl?: string | null
  isBookmarked?: boolean
  isLoggedIn?: boolean
}

export function HomePillCard({
  contentId,
  slug,
  title,
  excerpt,
  coverImageUrl,
  categoryTag,
  categoryTagSlug,
  accentColor,
  authorName,
  authorSlug,
  authorAvatarUrl,
  isBookmarked = false,
  isLoggedIn = false,
}: HomePillCardProps) {
  const tagBg = accentColor ? `${accentColor}1a` : 'rgba(107,142,35,0.12)'
  const tagColor = accentColor ?? '#6B8E23'
  const tagBorder = accentColor ? `${accentColor}33` : 'rgba(107,142,35,0.25)'

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: '#fdfcfa',
        border: '1px solid #d4a574',
        boxShadow: '0 2px 8px rgba(93,78,55,0.08)',
      }}
    >
      {/* Optional cover image */}
      {coverImageUrl && (
        <Link href={`/pills/${slug}`} className="block shrink-0" style={{ textDecoration: 'none' }}>
          <img
            src={coverImageUrl}
            alt={title}
            className="w-full object-cover"
            style={{ height: 160 }}
            loading="lazy"
          />
        </Link>
      )}

      {/* Card body */}
      <div className="flex flex-col gap-3 flex-1 p-5">
        {/* Badge row */}
        <div className="flex items-center justify-between">
          {categoryTag ? (
            categoryTagSlug ? (
              <Link
                href={`/tag/${categoryTagSlug}`}
                className="text-xs px-3 py-1 rounded-full hover:opacity-80 transition-opacity"
                style={{
                  background: tagBg,
                  color: tagColor,
                  border: `1px solid ${tagBorder}`,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  textDecoration: 'none',
                }}
              >
                {categoryTag}
              </Link>
            ) : (
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  background: tagBg,
                  color: tagColor,
                  border: `1px solid ${tagBorder}`,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                }}
              >
                {categoryTag}
              </span>
            )
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <BookmarkButton
              contentId={contentId}
              initialIsBookmarked={isBookmarked}
              isLoggedIn={isLoggedIn}
            />
            <button
              className="flex items-center justify-center rounded-lg transition-colors hover:bg-[#d4a574]/20"
              style={{ width: 28, height: 28, color: '#8B7355', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Share"
              title="Share"
            >
              <ShareIcon />
            </button>
          </div>
        </div>

        {/* Title */}
        <Link href={`/pills/${slug}`} style={{ textDecoration: 'none' }}>
          <h3
            className="leading-snug line-clamp-3 hover:text-primary transition-colors"
            style={{
              fontFamily: 'Audiowide, sans-serif',
              fontSize: 15,
              color: '#2C2420',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </h3>
        </Link>

        {/* Excerpt */}
        {excerpt && (
          <p
            className="text-sm line-clamp-3 flex-1"
            style={{ color: '#6b5744', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}
          >
            {excerpt}
          </p>
        )}

        {/* Footer */}
        {authorName && (
          <div
            className="flex items-center gap-2 pt-3 mt-auto"
            style={{ borderTop: '1px solid rgba(212,165,116,0.3)' }}
          >
            <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={28} />
            <div className="min-w-0">
              <Link
                href={authorSlug ? `/author/${authorSlug}` : '#'}
                className="text-sm font-medium text-[#5d4e37] truncate block"
                style={{ fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}
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
        background: '#fdfcfa',
        border: '1px solid #d4a574',
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
              background: 'linear-gradient(160deg,#8b4513,#a0522d)',
              fontFamily: 'JetBrains Mono, monospace',
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
              color: '#5d4e37',
              fontFamily: 'JetBrains Mono, monospace',
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
              fontFamily: 'Audiowide, sans-serif',
              fontSize: 18,
              color: '#2C2420',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </h3>
        </Link>

        {excerpt && (
          <p
            className="text-sm line-clamp-2"
            style={{ color: '#6b5744', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}
          >
            {excerpt}
          </p>
        )}

        {/* Duration + students */}
        {(duration || studentsCount != null) && (
          <div
            className="flex items-center gap-4 text-xs"
            style={{ color: '#8B7355', fontFamily: 'Inter, sans-serif' }}
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
            style={{ borderTop: '1px solid rgba(212,165,116,0.3)' }}
          >
            <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={30} />
            <div className="min-w-0">
              <p
                className="text-sm font-medium text-[#5d4e37] truncate"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {authorName}
              </p>
              {authorSlug && (
                <Link
                  href={`/author/${authorSlug}`}
                  className="text-xs hover:underline"
                  style={{
                    color: '#A0522D',
                    fontFamily: 'Inter, sans-serif',
                    textDecoration: 'none',
                  }}
                >
                  {viewProfileLabel ?? 'View profile'}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
