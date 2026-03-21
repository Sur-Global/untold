import { Link } from '@/i18n/navigation'
import type { ContentType } from '@/lib/supabase/types'

const TYPE_PATHS: Record<ContentType, string> = {
  article: 'articles',
  video: 'videos',
  podcast: 'podcasts',
  pill: 'pills',
  course: 'courses',
}

const TYPE_BADGE: Record<ContentType, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
  pill: 'Pill',
  course: 'Course',
}

interface ContentCardProps {
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
  duration?: string | null
  episodeNumber?: string | null
  accentColor?: string | null
  rating?: number | null
  price?: number | null
  currency?: string | null
}

export function ContentCard({
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
  const pillStyle = type === 'pill' && accentColor
    ? { borderTop: `3px solid ${accentColor}` }
    : undefined

  return (
    <article
      className="rounded-lg overflow-hidden bg-[#FAF7F2] transition-shadow hover:shadow-lg"
      style={{
        border: '1px solid rgba(139,69,19,0.12)',
        boxShadow: '0 2px 8px rgba(44,36,32,0.06)',
        ...pillStyle,
      }}
    >
      {/* Cover image */}
      {image && (
        <Link href={href}>
          <img
            src={image}
            alt={title}
            className="w-full aspect-video object-cover"
            loading="lazy"
          />
        </Link>
      )}

      <div className="p-5">
        {/* Type badge + duration */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ background: 'rgba(160,82,45,0.1)', color: '#A0522D' }}
          >
            {TYPE_BADGE[type]}
          </span>
          {duration && (
            <span className="text-xs font-mono text-[#6B5F58]">{duration}</span>
          )}
          {episodeNumber && (
            <span className="text-xs font-mono text-[#6B5F58]">{episodeNumber}</span>
          )}
          {rating != null && (
            <span className="text-xs font-mono text-[#6B5F58]">★ {rating.toFixed(1)}</span>
          )}
        </div>

        {/* Title */}
        <h3 className="mb-2 text-base leading-snug" style={{ fontFamily: 'Audiowide, sans-serif', textTransform: 'uppercase' }}>
          <Link href={href} className="hover:text-[#A0522D] transition-colors">
            {title}
          </Link>
        </h3>

        {/* Excerpt / description */}
        {blurb && (
          <p className="text-sm text-[#6B5F58] line-clamp-2 mb-3">{blurb}</p>
        )}

        {/* Price (courses) */}
        {price != null && (
          <p className="text-sm font-mono font-semibold text-[#A0522D] mb-3">
            {price === 0 ? 'Free' : currency ? `${currency} ${price}` : String(price)}
          </p>
        )}

        {/* Footer: author + likes + date */}
        <div className="flex items-center justify-between text-xs text-[#6B5F58] font-mono mt-3 pt-3" style={{ borderTop: '1px solid rgba(139,69,19,0.08)' }}>
          {authorName && authorSlug && (
            <Link href={`/author/${authorSlug}`} className="hover:text-[#A0522D] truncate max-w-[60%]">
              {authorName}
            </Link>
          )}
          <div className="flex items-center gap-3 ml-auto">
            {likesCount != null && likesCount > 0 && (
              <span>♥ {likesCount}</span>
            )}
            {publishedAt && (
              <span>{new Date(publishedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
