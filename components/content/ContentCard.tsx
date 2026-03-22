import { Link } from '@/i18n/navigation'
import type { ContentType } from '@/lib/supabase/types'
import { BookmarkButton } from '@/components/social/BookmarkButton'

const TYPE_PATHS: Record<ContentType, string> = {
  article: 'articles',
  video: 'videos',
  podcast: 'podcasts',
  pill: 'pills',
  course: 'courses',
}

const TYPE_LABEL: Record<ContentType, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
  pill: 'Pill',
  course: 'Course',
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
  readTimeMinutes?: number | null
  isBookmarked?: boolean
  isLoggedIn?: boolean
  isFeatured?: boolean
  duration?: string | null
  episodeNumber?: string | null
  accentColor?: string | null
  rating?: number | null
  price?: number | null
  currency?: string | null
}

function AuthorAvatar({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? ''}
        width={24}
        height={24}
        className="rounded-full object-cover shrink-0"
        style={{ width: 24, height: 24 }}
      />
    )
  }
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  return (
    <span
      className="rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
      style={{ width: 24, height: 24, background: '#8b4513', fontFamily: 'JetBrains Mono, monospace' }}
    >
      {initial}
    </span>
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
  readTimeMinutes,
  isBookmarked = false,
  isLoggedIn = false,
  isFeatured = false,
  duration,
  episodeNumber,
  accentColor,
  rating,
  price,
  currency,
}: ContentCardProps) {
  const href = `/${TYPE_PATHS[type]}/${slug}`
  const blurb = excerpt ?? description
  const image = coverImageUrl ?? thumbnailUrl

  return (
    <article
      className="rounded-lg overflow-hidden bg-[#FAF7F2] transition-shadow hover:shadow-lg"
      style={{
        border: '1px solid rgba(139,69,19,0.12)',
        boxShadow: '0 2px 8px rgba(44,36,32,0.06)',
      }}
    >
      {/* Cover image with overlaid badges */}
      <div className="relative">
        {image ? (
          <Link href={href}>
            <img
              src={image}
              alt={title}
              className="w-full aspect-video object-cover"
              loading="lazy"
            />
          </Link>
        ) : (
          <div className="w-full aspect-video bg-[#e8e0d8]" />
        )}

        {/* Featured star — top left */}
        {isFeatured && (
          <span
            className="absolute top-2 left-2 text-sm"
            title="Featured"
            style={{ color: '#F5C518', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
          >
            ★
          </span>
        )}

        {/* Type badge — top right */}
        <span
          className="absolute top-2 right-2 text-xs font-mono px-2 py-0.5 rounded"
          style={{ background: 'rgba(139,69,19,0.85)', color: '#fff', fontSize: 11 }}
        >
          {TYPE_LABEL[type]}
        </span>

        {/* Category tag — bottom left */}
        {categoryTag && (
          <span
            className="absolute bottom-2 left-2 text-xs font-mono px-2 py-0.5 rounded"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11 }}
          >
            {categoryTag}
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Duration / episode / rating line */}
        {(duration || episodeNumber || rating != null) && (
          <div className="flex items-center gap-2 mb-2 text-xs font-mono text-[#6B5F58]">
            {episodeNumber && <span>Ep. {episodeNumber}</span>}
            {duration && <span>{duration}</span>}
            {rating != null && <span>★ {rating.toFixed(1)}</span>}
          </div>
        )}

        {/* Title */}
        <h3
          className="mb-2 text-sm leading-snug"
          style={{ fontFamily: 'Audiowide, sans-serif', textTransform: 'uppercase' }}
        >
          <Link href={href} className="hover:text-[#A0522D] transition-colors">
            {title}
          </Link>
        </h3>

        {/* Excerpt */}
        {blurb && (
          <p className="text-xs text-[#6B5F58] line-clamp-2 mb-3">{blurb}</p>
        )}

        {/* Price (courses) */}
        {price != null && (
          <p className="text-sm font-mono font-semibold text-[#A0522D] mb-2">
            {price === 0 ? 'Free' : currency ? `${currency} ${price}` : String(price)}
          </p>
        )}

        {/* Author row */}
        {authorName && (
          <div className="flex items-center gap-2 mb-3">
            <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} />
            <Link
              href={authorSlug ? `/author/${authorSlug}` : '#'}
              className="text-xs font-mono text-[#6B5F58] hover:text-[#A0522D] truncate"
            >
              {authorName}
            </Link>
            {type === 'article' && readTimeMinutes && (
              <span className="text-xs font-mono text-[#9B8D85] ml-auto shrink-0">
                {readTimeMinutes} min read
              </span>
            )}
          </div>
        )}

        {/* Likes + bookmark */}
        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: '1px solid rgba(139,69,19,0.08)' }}
        >
          <span className="text-xs font-mono text-[#6B5F58]">
            {likesCount != null && likesCount > 0 ? `♥ ${likesCount}` : '♥ 0'}
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
