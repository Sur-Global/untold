'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'
import { toggleAuthorFeatured } from '@/lib/actions/author'

type Tab = 'all' | 'article' | 'video' | 'podcast' | 'pill'

interface ContentItem {
  id: string
  type: string
  slug: string
  isFeatured: boolean
  isAuthorFeatured?: boolean
  coverImageUrl: string | null
  likesCount: number
  publishedAt: string | null
  title: string
  excerpt: string | null
  description: string | null
  tags: Array<{ slug: string; label: string }>
  thumbnailUrl: string | null
  duration: string | null
  episodeNumber: string | null
  podcastCoverUrl: string | null
  accentColor: string | null
  pillImageUrl: string | null
}

interface Props {
  items: ContentItem[]
  authorName: string
  authorSlug: string
  authorAvatarUrl: string | null
  isLoggedIn: boolean
  /** The author themselves, or an editor/admin: can star items to feature them first */
  canManage?: boolean
}

function AuthorAvatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover object-top shrink-0"
      />
    )
  }
  return (
    <span
      className="rounded-full shrink-0 flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, background: '#1a1a1a', fontSize: size * 0.4 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function ArticleFeaturedCard({ item, authorName, authorSlug, authorAvatarUrl, isLoggedIn, t }: {
  item: ContentItem
  authorName: string
  authorSlug: string
  authorAvatarUrl: string | null
  isLoggedIn: boolean
  t: ReturnType<typeof useTranslations>
}) {
  const image = item.coverImageUrl
  return (
    <article
      className="relative overflow-hidden rounded-[16px] flex-1 min-w-0"
      style={{ border: '1.5px solid rgba(0,0,0,0.12)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
    >
      <Link href={`/articles/${item.slug}`} className="block">
        <div className="relative aspect-[813/490]">
          {image ? (
            <img src={image} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#111]" />
          )}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.12) 100%)' }}
          />
          {/* FEATURED badge */}
          <div
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-white text-xs"
            style={{
              background: 'rgba(0,0,0,0.75)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 2 .7-4L2.2 5.2l4-.6z" />
            </svg>
            <span className="font-heading uppercase tracking-wide">{t('featuredBadge')}</span>
          </div>
          {/* Category tag */}
          {item.tags[0] && (
            <div
              className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs text-white/80"
              style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {item.tags[0].label}
            </div>
          )}
          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <h3 className="text-white text-[30px] leading-[1.2] mb-3 max-w-[470px]">
              {item.title}
            </h3>
              <div
              className="flex items-center justify-between pt-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.18)' }}
            >
              <div className="flex items-center gap-3">
                <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={40} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-[14px]">{authorName}</span>
                    <span
                      className="text-white/70 text-[12px] px-2 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
                    >
                      {t('authorBadge')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <LikeButton
                  contentId={item.id}
                  initialIsLiked={false}
                  initialCount={item.likesCount}
                  isLoggedIn={isLoggedIn}
                  className="text-white/75 hover:text-white"
                />
                <BookmarkButton
                  contentId={item.id}
                  initialIsBookmarked={false}
                  isLoggedIn={isLoggedIn}
                  className="text-white/75 hover:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  )
}

function ArticleCard({ item, authorName, authorSlug, authorAvatarUrl, isLoggedIn, t }: {
  item: ContentItem
  authorName: string
  authorSlug: string
  authorAvatarUrl: string | null
  isLoggedIn: boolean
  t: ReturnType<typeof useTranslations>
}) {
  const image = item.coverImageUrl
  return (
    <article
      className="rounded-[16px] overflow-hidden bg-white flex flex-col"
      style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <Link href={`/articles/${item.slug}`} className="block relative">
        <div className="relative aspect-[394/224]">
          {image ? (
            <img src={image} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#f3f4f6]" />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.08) 55%, rgba(0,0,0,0) 100%)' }} />
          {item.tags[0] && (
            <div
              className="absolute top-3 left-4 px-3 py-1 rounded-full text-xs text-foreground/70"
              style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.1)' }}
            >
              {item.tags[0].label}
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-col gap-3 flex-1 px-6 pt-6">
        <h3 className="text-[18px] leading-[1.3] text-foreground line-clamp-2">
          <Link href={`/articles/${item.slug}`} className="hover:text-primary transition-colors">
            {item.title}
          </Link>
        </h3>
      </div>
      <div className="px-6 pt-4 pb-6" style={{ borderTop: '1px solid rgba(0,0,0,0.07)', marginTop: 'auto' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={32} />
            <div className="flex items-center gap-2">
              <Link href={`/author/${authorSlug}`} className="text-[14px] font-medium text-foreground hover:text-primary transition-colors">
                {authorName}
              </Link>
              <span className="text-[12px] px-2 py-0.5 rounded text-foreground/50" style={{ background: '#f3f4f6' }}>
                {t('authorBadge')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LikeButton contentId={item.id} initialIsLiked={false} initialCount={item.likesCount} isLoggedIn={isLoggedIn} />
            <BookmarkButton contentId={item.id} initialIsBookmarked={false} isLoggedIn={isLoggedIn} />
          </div>
        </div>
      </div>
    </article>
  )
}

function VideoCard({ item, authorName, authorSlug, authorAvatarUrl, t }: {
  item: ContentItem
  authorName: string
  authorSlug: string
  authorAvatarUrl: string | null
  t: ReturnType<typeof useTranslations>
}) {
  const image = item.thumbnailUrl ?? item.coverImageUrl
  return (
    <div className="w-[394px] shrink-0">
      <div
        className="rounded-[16px] overflow-hidden relative"
        style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <Link href={`/videos/${item.slug}`} className="block relative aspect-[394/223]">
          {image ? (
            <img src={image} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#111]" />
          )}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex items-center justify-center rounded-full size-16"
              style={{ background: 'rgba(0,0,0,0.8)', border: '1.5px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          {item.duration && (
            <div
              className="absolute bottom-3 right-3 px-2 py-1 rounded-[7px] text-xs text-white/85 flex items-center gap-1.5"
              style={{ background: 'rgba(0,0,0,0.72)' }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm.5 2.5v4.25l2.75 1.6-.75 1.3-3.5-2.05V5h1.5z" />
              </svg>
              {item.duration}
            </div>
          )}
          {item.tags[0] && (
            <div
              className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs text-foreground/70"
              style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.1)' }}
            >
              {item.tags[0].label}
            </div>
          )}
        </Link>
      </div>
      <h4 className="text-[16px] leading-[1.4] text-foreground mt-4 mb-3">{item.title}</h4>
      <div className="flex items-center gap-3">
        <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={24} />
        <div>
          <p className="text-[14px] font-medium text-foreground/70">{authorName}</p>
          <Link href={`/author/${authorSlug}`} className="text-[12px] text-foreground/50 hover:text-foreground hover:underline transition-colors">
            {t('moreFrom', { name: authorName.split(' ')[0] })}
          </Link>
        </div>
      </div>
    </div>
  )
}

function PodcastCard({ item, authorName, authorSlug, authorAvatarUrl, t }: {
  item: ContentItem
  authorName: string
  authorSlug: string
  authorAvatarUrl: string | null
  t: ReturnType<typeof useTranslations>
}) {
  const image = item.podcastCoverUrl ?? item.coverImageUrl
  return (
    <article
      className="rounded-[16px] overflow-hidden bg-white"
      style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: 604 }}
    >
      <div className="flex gap-4 p-5">
        <div
          className="rounded-[10px] overflow-hidden shrink-0 size-28"
          style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          {image ? (
            <img src={image} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#f3f4f6] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {item.episodeNumber && (
            <p className="text-[12px] font-medium text-foreground/50">{t('episode', { number: item.episodeNumber })}</p>
          )}
          <h4 className="text-[16px] leading-[1.4] text-foreground">{item.title}</h4>
          {(item.excerpt ?? item.description) && (
            <p className="text-[14px] text-foreground/60 leading-[1.43] line-clamp-2">{item.excerpt ?? item.description}</p>
          )}
          {item.duration && (
            <div className="flex items-center gap-2 text-[14px] text-foreground/50">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm.5 2.5v4.25l2.75 1.6-.75 1.3-3.5-2.05V5h1.5z" />
              </svg>
              {item.duration}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={24} />
        <div>
          <p className="text-[14px] font-medium text-foreground/70">{authorName}</p>
          <Link href={`/author/${authorSlug}`} className="text-[12px] text-foreground/50 hover:text-foreground hover:underline transition-colors">
            {t('moreFrom', { name: authorName.split(' ')[0] })}
          </Link>
        </div>
      </div>
    </article>
  )
}

function PillCard({ item, authorName, authorSlug, authorAvatarUrl, isLoggedIn, t }: {
  item: ContentItem
  authorName: string
  authorSlug: string
  authorAvatarUrl: string | null
  isLoggedIn: boolean
  t: ReturnType<typeof useTranslations>
}) {
  const image = item.pillImageUrl ?? item.coverImageUrl
  const accent = item.accentColor ?? '#6b7280'
  return (
    <article
      className="rounded-[16px] overflow-hidden bg-white flex flex-col"
      style={{ border: `1px solid ${accent}35`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <div className="relative h-48 overflow-hidden">
        {image ? (
          <img src={image} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `${accent}12` }} />
        )}
      </div>
      <div className="p-6 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between">
          <span
            className="text-[12px] font-medium px-3 py-1 rounded-full"
            style={{ background: `${accent}18`, border: `1px solid ${accent}35`, color: accent }}
          >
            {item.tags[0]?.label ?? 'Pill'}
          </span>
          <div className="flex items-center gap-2">
            <BookmarkButton contentId={item.id} initialIsBookmarked={false} isLoggedIn={isLoggedIn} />
            <LikeButton contentId={item.id} initialIsLiked={false} initialCount={item.likesCount} isLoggedIn={isLoggedIn} />
          </div>
        </div>
        <h4 className="text-[16px] leading-[1.4] text-foreground">{item.title}</h4>
        {(item.excerpt ?? item.description) && (
          <p className="text-[14px] text-foreground/60 leading-[1.43] line-clamp-3">{item.excerpt ?? item.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderTop: `1px solid ${accent}25` }}>
        <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={24} />
        <div>
          <p className="text-[12px] font-medium text-foreground/70">{authorName}</p>
          <Link href={`/author/${authorSlug}`} className="text-[12px] text-foreground/50 hover:text-foreground hover:underline transition-colors">
            {t('moreFrom', { name: authorName.split(' ')[0] })}
          </Link>
        </div>
      </div>
    </article>
  )
}


const TYPE_PATH: Record<string, string> = { article: 'articles', video: 'videos', podcast: 'podcasts', pill: 'pills' }

function itemImage(item: ContentItem): string | null {
  return item.coverImageUrl ?? item.thumbnailUrl ?? item.podcastCoverUrl ?? item.pillImageUrl ?? null
}

/** Star toggle shown to the author (and editors) to feature an item first on the profile. */
function StarButton({ item, t }: { item: ContentItem; t: ReturnType<typeof useTranslations> }) {
  const [starred, setStarred] = useState(!!item.isAuthorFeatured)
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      title={starred ? t('starRemove') : t('starAdd')}
      aria-label={starred ? t('starRemove') : t('starAdd')}
      onClick={() => {
        setStarred((v) => !v)
        startTransition(async () => {
          try { setStarred(await toggleAuthorFeatured(item.id)) } catch { setStarred((v) => !v) }
        })
      }}
      className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110 disabled:opacity-60"
      style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.3)' }}
    >
      <svg width="18" height="18" viewBox="0 0 16 16" fill={starred ? '#F5C518' : 'none'} stroke={starred ? '#F5C518' : '#fff'} strokeWidth="1.2" strokeLinejoin="round">
        <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 2 .7-4L2.2 5.2l4-.6z" />
      </svg>
    </button>
  )
}

/** Compact, type-agnostic tile used for featured items and for authors with little content. */
function ContentTile({ item, large, canManage, t }: {
  item: ContentItem
  large?: boolean
  canManage?: boolean
  t: ReturnType<typeof useTranslations>
}) {
  const image = itemImage(item)
  return (
    <div className={`relative ${large ? 'sm:col-span-2 sm:row-span-2' : ''}`}>
      <Link
        href={`/${TYPE_PATH[item.type] ?? 'articles'}/${item.slug}`}
        className="group relative block h-full overflow-hidden rounded-[16px]"
        style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}
      >
        <div className={`relative ${large ? 'aspect-[16/10] sm:aspect-auto sm:h-full sm:min-h-[320px]' : 'aspect-[16/10]'} bg-[#111]`}>
          {image && (
            <img src={image} alt={item.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.05) 100%)' }} />
          {item.isAuthorFeatured && (
            <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[11px] uppercase tracking-wide text-white" style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="#F5C518"><path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 2 .7-4L2.2 5.2l4-.6z" /></svg>
              {t('featuredBadge')}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <span className="mb-1.5 inline-block text-[11px] uppercase tracking-wider text-white/70">
              {item.tags[0]?.label ?? item.type}
            </span>
            <h3 className={`text-white leading-[1.25] ${large ? 'text-[24px] sm:text-[28px]' : 'text-[17px]'} line-clamp-3`}>
              {item.title}
            </h3>
          </div>
        </div>
      </Link>
      {canManage && <StarButton item={item} t={t} />}
    </div>
  )
}

export function AuthorContentTabs({ items, authorName, authorSlug, authorAvatarUrl, isLoggedIn, canManage }: Props) {
  const t = useTranslations('author')
  const [activeTab, setActiveTab] = useState<Tab>('all')

  const starred = items.filter((i) => i.isAuthorFeatured)
  const articles = items.filter(i => i.type === 'article')
  const videos = items.filter(i => i.type === 'video')
  const podcasts = items.filter(i => i.type === 'podcast')
  const pills = items.filter(i => i.type === 'pill')

  const allTabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: t('tabAll'), count: items.length },
    { id: 'article', label: t('tabArticles'), count: articles.length },
    { id: 'video', label: t('tabVideos'), count: videos.length },
    { id: 'podcast', label: t('tabPodcasts'), count: podcasts.length },
    { id: 'pill', label: t('tabPills'), count: pills.length },
  ]
  const tabs = allTabs.filter(tab => tab.id === 'all' || tab.count > 0)

  const showArticles = activeTab === 'all' || activeTab === 'article'
  const showVideos = activeTab === 'all' || activeTab === 'video'
  const showPodcasts = activeTab === 'all' || activeTab === 'podcast'
  const showPills = activeTab === 'all' || activeTab === 'pill'

  // Always feature the most recently published article (DB is ordered by published_at DESC)
  const featuredArticle = starred.length > 0 ? null : (articles[0] ?? null)
  const otherArticles = starred.length > 0
    ? articles.filter((a) => !(activeTab === 'all' && a.isAuthorFeatured))
    : articles.slice(1)

  const cardProps = { authorName, authorSlug, authorAvatarUrl, isLoggedIn, t }

  // Authors with little content get a compact, contained layout instead of a
  // full-width hero card and a stack of mostly empty sections.
  const compact = items.length <= 4

  if (compact && items.length > 0) {
    const rest = items.filter((i) => !i.isAuthorFeatured)
    return (
      <div className="max-w-[1000px] mx-auto px-6 py-12 flex flex-col gap-10">
        {starred.length > 0 && (
          <section>
            <h2 className="text-[24px] leading-[1.3] text-foreground mb-5">{t('featuredSection')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {starred.map((item, i) => (
                <ContentTile key={item.id} item={item} large={i === 0 && starred.length > 1} canManage={canManage} t={t} />
              ))}
            </div>
          </section>
        )}
        {rest.length > 0 && (
          <section>
            {starred.length > 0 && <h2 className="text-[24px] leading-[1.3] text-foreground mb-5">{t('tabAll')}</h2>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map((item) => (
                <ContentTile key={item.id} item={item} canManage={canManage} t={t} />
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  // Larger catalogues: starred items lead on the "all" tab (homepage-style), the rest follows
  const showStarredLead = activeTab === 'all' && starred.length > 0

  return (
    <>
      {/* Tab bar */}
      <div
        className="sticky top-[64px] z-10"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex gap-0 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative px-5 py-4 text-[14px] shrink-0 tracking-[0.28px] transition-colors"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono, monospace)',
                  color: activeTab === tab.id ? '#111' : '#6b7280',
                  fontWeight: activeTab === tab.id ? 500 : 400,
                }}
              >
                {tab.label} ({tab.count})
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-col gap-16">

        {showStarredLead && (
          <section>
            <h2 className="text-[28px] leading-[1.3] text-foreground mb-6">{t('featuredSection')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {starred.map((item, i) => (
                <ContentTile key={item.id} item={item} large={i === 0 && starred.length > 2} canManage={canManage} t={t} />
              ))}
            </div>
          </section>
        )}

        {/* Articles */}
        {showArticles && articles.length > 0 && (
          <section>
            <h2 className="text-[28px] leading-[1.3] text-foreground mb-6">{t('sectionArticles')}</h2>
            {featuredArticle && (
              <ArticleFeaturedCard item={featuredArticle} {...cardProps} />
            )}
            {otherArticles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {otherArticles.map(item => (
                  <ArticleCard key={item.id} item={item} {...cardProps} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Videos */}
        {showVideos && videos.length > 0 && (
          <section>
            <h2 className="text-[28px] leading-[1.3] text-foreground mb-6">{t('sectionVideos')}</h2>
            <div className="flex flex-wrap gap-6">
              {videos.map(item => (
                <VideoCard key={item.id} item={item} authorName={authorName} authorSlug={authorSlug} authorAvatarUrl={authorAvatarUrl} t={t} />
              ))}
            </div>
          </section>
        )}

        {/* Podcasts */}
        {showPodcasts && podcasts.length > 0 && (
          <section>
            <h2 className="text-[28px] leading-[1.3] text-foreground mb-6">{t('sectionPodcasts')}</h2>
            <div className="flex flex-wrap gap-6">
              {podcasts.map(item => (
                <PodcastCard key={item.id} item={item} authorName={authorName} authorSlug={authorSlug} authorAvatarUrl={authorAvatarUrl} t={t} />
              ))}
            </div>
          </section>
        )}

        {/* Knowledge Pills */}
        {showPills && pills.length > 0 && (
          <section>
            <h2 className="text-[28px] leading-[1.3] text-foreground mb-6">{t('sectionPills')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pills.map(item => (
                <PillCard key={item.id} item={item} {...cardProps} />
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <p className="text-foreground/50 text-center py-16">{t('noContent')}</p>
        )}
      </div>
    </>
  )
}
