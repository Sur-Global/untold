'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { languageLabel } from '@/lib/language-availability'
import { readableTextColor } from '@/lib/cover-formats'
import type { PillSlide } from '@/lib/pill-slides'
import { AuthorAvatar } from '@/components/content/ContentCard'
import { BookmarkButton } from '@/components/social/BookmarkButton'
import { PillCover } from '@/components/pills/PillCover'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

/**
 * A knowledge pill on its listing page: the slide, big and whole, on one side (4:5, the title over the photo as
 * designed) and its topic, title, summary, author, likes and save on the other. On a phone the slide goes on top.
 */
export function PillListCard({
  contentId,
  slug,
  title,
  excerpt,
  coverImageUrl,
  coverSlide,
  accentColor,
  categoryTag,
  categoryTagSlug,
  authorName,
  authorSlug,
  authorAvatarUrl,
  likesCount,
  isBookmarked = false,
  isLoggedIn = false,
  singleLanguage = false,
  sourceLocale,
  subtitleLocales,
}: {
  contentId: string
  slug: string
  title: string
  excerpt?: string | null
  coverImageUrl?: string | null
  coverSlide?: PillSlide | null
  accentColor?: string | null
  categoryTag?: string | null
  categoryTagSlug?: string | null
  authorName?: string | null
  authorSlug?: string | null
  authorAvatarUrl?: string | null
  likesCount?: number
  isBookmarked?: boolean
  isLoggedIn?: boolean
  singleLanguage?: boolean
  sourceLocale?: string | null
  subtitleLocales?: string[] | null
}) {
  const tContent = useTranslations('content')
  const uiLocale = useLocale()
  const chipBg = accentColor ?? 'rgba(107,142,35,0.12)'
  const chipStyle: React.CSSProperties = {
    ...aeonik,
    background: chipBg,
    color: accentColor ? readableTextColor(accentColor) : '#6B8E23',
    border: `1px solid ${accentColor ? 'rgba(0,0,0,0.12)' : 'rgba(107,142,35,0.25)'}`,
    fontSize: 11,
    textDecoration: 'none',
  }

  return (
    <article
      className="flex flex-col gap-5 rounded-2xl p-4 sm:flex-row sm:gap-6 sm:p-5"
      style={{ background: '#fdfcfa', border: '1px solid #d4a574', boxShadow: '0px 2px 8px rgba(93,78,55,0.1)' }}
    >
      <PillCover className="w-full shrink-0 sm:w-[42%]" slug={slug} title={title} coverImageUrl={coverImageUrl} coverSlide={coverSlide} accentColor={accentColor} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          {categoryTag &&
            (categoryTagSlug ? (
              <Link href={`/tag/${categoryTagSlug}`} className="rounded-full px-3 py-1 transition-opacity hover:opacity-80" style={chipStyle}>
                {categoryTag}
              </Link>
            ) : (
              <span className="rounded-full px-3 py-1" style={chipStyle}>{categoryTag}</span>
            ))}
          {singleLanguage && sourceLocale && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] text-[#5d4e37]" style={{ background: 'rgba(212,165,116,0.18)', fontFamily: 'JetBrains Mono, monospace' }}>
              🌐 {languageLabel(tContent, uiLocale, { sourceLocale, subtitleLocales })}
            </span>
          )}
        </div>

        <h3 className="mt-3 line-clamp-4 text-xl leading-snug" style={{ ...aeonik, fontWeight: 500, letterSpacing: '-0.01em', color: '#2C2420' }}>
          <Link href={`/pills/${slug}`} className="transition-colors hover:text-primary" style={{ textDecoration: 'none' }}>
            {title}
          </Link>
        </h3>

        {excerpt && (
          <p className="mt-3 line-clamp-6 text-sm leading-[1.7]" style={{ ...aeonik, color: '#6b5744' }}>
            {excerpt}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          {authorName ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} slug={authorSlug} />
              <Link href={authorSlug ? `/author/${authorSlug}` : '#'} className="truncate text-sm font-medium text-[#5d4e37] transition-colors hover:text-primary" style={aeonik}>
                {authorName}
              </Link>
            </div>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 items-center gap-3">
            <span className="flex items-center gap-1 text-xs" style={{ ...aeonik, color: '#8b7355' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 13.5S2 9.8 2 5.5a3 3 0 015.5-1.6A3 3 0 0114 5.5C14 9.8 8 13.5 8 13.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {likesCount ?? 0}
            </span>
            <BookmarkButton contentId={contentId} initialIsBookmarked={isBookmarked} isLoggedIn={isLoggedIn} />
          </div>
        </div>
      </div>
    </article>
  )
}
