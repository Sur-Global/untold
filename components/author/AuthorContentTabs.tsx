'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'

type Tab = 'all' | 'article' | 'video' | 'podcast' | 'pill'

interface ContentItem {
  id: string
  type: string
  slug: string
  isFeatured: boolean
  coverImageUrl: string | null
  likesCount: number
  publishedAt: string | null
  title: string
  excerpt: string | null
  description: string | null
  tags: string[]
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
}

function AuthorAvatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <span
      className="rounded-full shrink-0 flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, background: '#8b4513', fontSize: size * 0.4 }}
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
      style={{ border: '1.8px solid #b8860b', boxShadow: '0 8px 24px rgba(139,69,19,0.15)' }}
    >
      <Link href={`/articles/${item.slug}`} className="block">
        <div className="relative aspect-[813/490]">
          {image ? (
            <img src={image} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#2c2418]" />
          )}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.15) 100%)' }}
          />
          {/* FEATURED badge */}
          <div
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-white text-xs"
            style={{
              background: 'linear-gradient(165deg, #b8860b 0%, #daa520 100%)',
              boxShadow: '0 4px 12px rgba(184,134,11,0.4)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 2 .7-4L2.2 5.2l4-.6z" />
            </svg>
            <span className="font-['Audiowide',sans-serif] uppercase tracking-wide">{t('featuredBadge')}</span>
          </div>
          {/* Category tag */}
          {item.tags[0] && (
            <div
              className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs text-[#e8d5b5]"
              style={{ background: 'rgba(13,13,13,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {item.tags[0].replace(/-/g, ' ')}
            </div>
          )}
          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <h3 className="text-white text-[30px] leading-[1.2] uppercase mb-3 max-w-[470px]">
              {item.title}
            </h3>
            {item.excerpt && (
              <p className="text-[rgba(255,255,255,0.9)] text-[18px] leading-[1.55] mb-6 max-w-[660px] line-clamp-2">
                {item.excerpt}
              </p>
            )}
            <div
              className="flex items-center justify-between pt-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}
            >
              <div className="flex items-center gap-3">
                <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={40} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-[14px]">{authorName}</span>
                    <span
                      className="text-white text-[12px] px-2 py-0.5 rounded"
                      style={{ background: 'rgba(184,134,11,0.9)' }}
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
                  className="text-white/80 hover:text-white"
                />
                <BookmarkButton
                  contentId={item.id}
                  initialIsBookmarked={false}
                  isLoggedIn={isLoggedIn}
                  className="text-white/80 hover:text-white"
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
      className="rounded-[16px] overflow-hidden bg-[#fdfcfa] flex flex-col"
      style={{ border: '0.9px solid #d4a574', boxShadow: '0 2px 8px rgba(93,78,55,0.1)' }}
    >
      <Link href={`/articles/${item.slug}`} className="block relative">
        <div className="relative aspect-[394/224]">
          {image ? (
            <img src={image} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#e8d5b5]" />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(44,36,32,0.6) 0%, rgba(44,36,32,0.1) 50%, rgba(0,0,0,0) 100%)' }} />
          {item.tags[0] && (
            <div
              className="absolute top-3 left-4 px-3 py-1 rounded-full text-xs text-[#6b5744]"
              style={{ background: 'rgba(253,252,250,0.9)', border: '0.9px solid rgba(212,165,116,0.3)' }}
            >
              {item.tags[0].replace(/-/g, ' ')}
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-col gap-3 flex-1 px-6 pt-6">
        <h3 className="text-[18px] leading-[1.3] text-[#5d4e37] uppercase line-clamp-2">
          <Link href={`/articles/${item.slug}`} className="hover:text-primary transition-colors">
            {item.title}
          </Link>
        </h3>
        {item.excerpt && (
          <p className="text-[14px] text-[#6b5744] leading-[1.7] line-clamp-2">{item.excerpt}</p>
        )}
      </div>
      <div className="px-6 pt-4 pb-6" style={{ borderTop: '0.9px solid #d4a574', marginTop: 'auto' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={32} />
            <div className="flex items-center gap-2">
              <Link href={`/author/${authorSlug}`} className="text-[14px] font-medium text-[#5d4e37] hover:text-primary">
                {authorName}
              </Link>
              <span className="text-[12px] px-2 py-0.5 rounded text-[#8b4513]" style={{ background: '#e8d5b5' }}>
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
        style={{ border: '0.9px solid #d4a574', boxShadow: '0 2px 8px rgba(93,78,55,0.1)' }}
      >
        <Link href={`/videos/${item.slug}`} className="block relative aspect-[394/223]">
          {image ? (
            <img src={image} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#2c2418]" />
          )}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex items-center justify-center rounded-full size-16"
              style={{ background: 'rgba(184,115,79,0.95)', border: '1.8px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 12px rgba(184,115,79,0.4)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          {item.duration && (
            <div
              className="absolute bottom-3 right-3 px-2 py-1 rounded-[7px] text-xs text-[#e8e6e3] flex items-center gap-1.5"
              style={{ background: 'rgba(13,13,13,0.8)' }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm.5 2.5v4.25l2.75 1.6-.75 1.3-3.5-2.05V5h1.5z" />
              </svg>
              {item.duration}
            </div>
          )}
          {item.tags[0] && (
            <div
              className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs text-[#6b5744]"
              style={{ background: 'rgba(253,252,250,0.9)', border: '0.9px solid rgba(212,165,116,0.3)' }}
            >
              {item.tags[0].replace(/-/g, ' ')}
            </div>
          )}
        </Link>
      </div>
      <h4 className="text-[16px] leading-[1.4] text-[#5d4e37] uppercase mt-4 mb-3">{item.title}</h4>
      <div className="flex items-center gap-3">
        <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={24} />
        <div>
          <p className="text-[14px] font-medium text-[#6b5744]">{authorName}</p>
          <Link href={`/author/${authorSlug}`} className="text-[12px] text-[#b8734f] hover:underline">
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
      className="rounded-[16px] overflow-hidden bg-[#fdfcfa]"
      style={{ border: '0.9px solid #d4a574', boxShadow: '0 2px 8px rgba(93,78,55,0.1)', maxWidth: 604 }}
    >
      <div className="flex gap-4 p-5">
        <div
          className="rounded-[10px] overflow-hidden shrink-0 size-28"
          style={{ border: '1.8px solid #d4a574', boxShadow: '0 2px 8px rgba(93,78,55,0.1)' }}
        >
          {image ? (
            <img src={image} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#e8d5b5] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a0522d" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {item.episodeNumber && (
            <p className="text-[12px] font-medium text-[#8b7355]">{t('episode', { number: item.episodeNumber })}</p>
          )}
          <h4 className="text-[16px] leading-[1.4] text-[#5d4e37] uppercase">{item.title}</h4>
          {(item.excerpt ?? item.description) && (
            <p className="text-[14px] text-[#6b5744] leading-[1.43] line-clamp-2">{item.excerpt ?? item.description}</p>
          )}
          {item.duration && (
            <div className="flex items-center gap-2 text-[14px] text-[#8b7355]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm.5 2.5v4.25l2.75 1.6-.75 1.3-3.5-2.05V5h1.5z" />
              </svg>
              {item.duration}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderTop: '0.9px solid #d4a574' }}>
        <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={24} />
        <div>
          <p className="text-[14px] font-medium text-[#6b5744]">{authorName}</p>
          <Link href={`/author/${authorSlug}`} className="text-[12px] text-[#b8734f] hover:underline">
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
  const accent = item.accentColor ?? '#a0522d'
  return (
    <article
      className="rounded-[16px] overflow-hidden bg-[#fdfcfa] flex flex-col"
      style={{ border: `0.9px solid ${accent}40`, boxShadow: '0 2px 8px rgba(93,78,55,0.1)' }}
    >
      <div className="relative h-48 overflow-hidden">
        {image ? (
          <img src={image} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `${accent}10` }} />
        )}
        <div className="absolute inset-0" style={{ background: `${accent}0f` }} />
      </div>
      <div className="p-6 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between">
          <span
            className="text-[12px] font-medium px-3 py-1 rounded-full"
            style={{ background: `${accent}20`, border: `0.9px solid ${accent}40`, color: accent }}
          >
            {item.tags[0]?.replace(/-/g, ' ') ?? 'Pill'}
          </span>
          <div className="flex items-center gap-2">
            <BookmarkButton contentId={item.id} initialIsBookmarked={false} isLoggedIn={isLoggedIn} />
            <LikeButton contentId={item.id} initialIsLiked={false} initialCount={item.likesCount} isLoggedIn={isLoggedIn} />
          </div>
        </div>
        <h4 className="text-[16px] leading-[1.4] text-[#5d4e37] uppercase">{item.title}</h4>
        {(item.excerpt ?? item.description) && (
          <p className="text-[14px] text-[#6b5744] leading-[1.43] line-clamp-3">{item.excerpt ?? item.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderTop: `0.9px solid ${accent}30` }}>
        <AuthorAvatar name={authorName} avatarUrl={authorAvatarUrl} size={24} />
        <div>
          <p className="text-[12px] font-medium text-[#6b5744]">{authorName}</p>
          <Link href={`/author/${authorSlug}`} className="text-[12px] text-[#b8734f] hover:underline">
            {t('moreFrom', { name: authorName.split(' ')[0] })}
          </Link>
        </div>
      </div>
    </article>
  )
}

export function AuthorContentTabs({ items, authorName, authorSlug, authorAvatarUrl, isLoggedIn }: Props) {
  const t = useTranslations('author')
  const [activeTab, setActiveTab] = useState<Tab>('all')

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

  const featuredArticle = articles.find(a => a.isFeatured) ?? articles[0] ?? null
  const otherArticles = articles.filter(a => a !== featuredArticle)

  const cardProps = { authorName, authorSlug, authorAvatarUrl, isLoggedIn, t }

  return (
    <>
      {/* Tab bar */}
      <div
        className="sticky top-0 z-10 bg-[rgba(253,252,250,0.95)]"
        style={{ borderBottom: '0.9px solid #d4a574' }}
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
                  color: activeTab === tab.id ? '#5d4e37' : '#8b7355',
                  fontWeight: activeTab === tab.id ? 500 : 400,
                }}
              >
                {tab.label} ({tab.count})
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: '#b8734f' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="max-w-[1280px] mx-auto px-6 py-12 flex flex-col gap-16">

        {/* Articles */}
        {showArticles && articles.length > 0 && (
          <section>
            <h2 className="text-[28px] leading-[1.3] text-[#5d4e37] uppercase mb-6">{t('sectionArticles')}</h2>
            <div className="flex gap-6 flex-wrap lg:flex-nowrap">
              {featuredArticle && (
                <ArticleFeaturedCard item={featuredArticle} {...cardProps} />
              )}
              {otherArticles.length > 0 && (
                <div className="flex flex-col gap-6 w-full lg:w-[394px] shrink-0">
                  {otherArticles.slice(0, 3).map(item => (
                    <ArticleCard key={item.id} item={item} {...cardProps} />
                  ))}
                </div>
              )}
            </div>
            {otherArticles.length > 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {otherArticles.slice(3).map(item => (
                  <ArticleCard key={item.id} item={item} {...cardProps} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Videos */}
        {showVideos && videos.length > 0 && (
          <section>
            <h2 className="text-[28px] leading-[1.3] text-[#5d4e37] uppercase mb-6">{t('sectionVideos')}</h2>
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
            <h2 className="text-[28px] leading-[1.3] text-[#5d4e37] uppercase mb-6">{t('sectionPodcasts')}</h2>
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
            <h2 className="text-[28px] leading-[1.3] text-[#5d4e37] uppercase mb-6">{t('sectionPills')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pills.map(item => (
                <PillCard key={item.id} item={item} {...cardProps} />
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <p className="text-[#6b5744] text-center py-16">{t('noContent')}</p>
        )}
      </div>
    </>
  )
}
