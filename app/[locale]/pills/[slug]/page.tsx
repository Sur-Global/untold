import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { LanguageNotice } from '@/components/content/LanguageNotice'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import type { Metadata } from 'next'
import { loadContentMetadata } from '@/lib/data/content-metadata'
import { RelatedContent } from '@/components/content/RelatedContent'
import { BodyTranslationLoader } from '@/components/content/BodyTranslationLoader'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'
import { ShareButton } from '@/components/social/ShareButton'
import { EditContentButton } from '@/components/content/EditContentButton'
import { AuthorByline } from '@/components/content/AuthorByline'
import { Link } from '@/i18n/navigation'
import { PillCarousel } from '@/components/pills/PillCarousel'
import { ShareBar } from '@/components/social/ShareBar'
import { TranslationRefresher } from '@/components/TranslationRefresher'
import { localizedSlides, parseSlides, slideCredits } from '@/lib/pill-slides'
import { localizedPath, siteUrl } from '@/lib/content-metadata'
import { normalizeAccent } from '@/lib/pill-accent'
import { readableTextColor } from '@/lib/cover-formats'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  return loadContentMetadata({ type: 'pill', slug, locale })
}

export default async function PillPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()
  const tContent = await getTranslations('content')

  const { data: { user } } = await supabase.auth.getUser()
  let navUserRole = null
  if (user) {
    const { data: navProfile } = await (supabase as any)
      .from('profiles').select('role').eq('id', user.id).single()
    navUserRole = navProfile?.role ?? null
  }
  const navProps = { isLoggedIn: !!user, userRole: navUserRole as any }

  const { data: pill } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, author_id, source_locale, single_language, subtitle_locales, likes_count, published_at,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, body, excerpt, locale ),
      pill_meta ( accent_color, image_url, format, slides, slide_translations ),
      content_tags ( tags ( slug, names ) )
    `)
    .eq('slug', slug)
    .eq('type', 'pill')
    .eq('status', 'published')
    .single()

  if (!pill) notFound()

  // "Only available in this language" content is never translated: readers in any
  // language get the original, with a label (see LanguageNotice)
  const singleLanguage: boolean = !!pill.single_language
  const contentLocale: string = singleLanguage ? (pill.source_locale ?? 'en') : locale
  const t = getTranslation(pill.content_translations ?? [], contentLocale)
  if (!t) notFound()

  const meta = pill.pill_meta
  const accentColor = normalizeAccent(meta?.accent_color)
  const sourceLocale: string = pill.source_locale ?? 'en'
  const sourceTranslation = (pill.content_translations ?? []).find((tr: any) => tr.locale === sourceLocale)
  const sourceBody = sourceTranslation?.body as Record<string, unknown> | null

  const usingFallback = t.locale !== contentLocale
  const body = usingFallback ? null : (t.body as Record<string, unknown> | null)
  const needsBody = contentLocale !== sourceLocale && !!sourceBody && (usingFallback || !body)

  // Carousel pills: the slides (their texts in the reader's language, where translated)
  const isCarousel = meta?.format === 'carousel'
  const { slides, translated: slidesTranslated } = localizedSlides(parseSlides(meta?.slides), meta?.slide_translations, contentLocale, sourceLocale)
  const needsSlides = isCarousel && contentLocale !== sourceLocale && !slidesTranslated
  const credits = slideCredits(slides)
  // a carousel can be shared as pictures (Instagram) and downloaded
  const slidesToShare = isCarousel && slides.length > 0 ? { slug: pill.slug, count: slides.length } : undefined
  const topics: { slug: string; name: string }[] = (pill.content_tags ?? [])
    .map((ct: any) => ct.tags)
    .filter(Boolean)
    .map((tag: any) => ({ slug: tag.slug, name: tag.names?.[locale] ?? tag.names?.en ?? tag.slug }))
  const pillUrl = `${siteUrl()}${localizedPath(locale, `/pills/${slug}`)}`

  if (needsBody || needsSlides) {
    after(async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
          },
          body: JSON.stringify({ contentId: pill.id, locale }),
        })
      } catch (err) {
        console.error('[translation-trigger] failed:', err)
      }
    })
  }

  let isLiked = false
  let isBookmarked = false
  if (user) {
    const [{ data: like }, { data: bookmark }] = await Promise.all([
      (supabase as any)
        .from('likes').select('user_id')
        .eq('user_id', user.id).eq('content_id', pill.id).maybeSingle(),
      (supabase as any)
        .from('bookmarks').select('user_id')
        .eq('user_id', user.id).eq('content_id', pill.id).maybeSingle(),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  return (
    <>
      <TranslationRefresher pending={needsSlides} />
      <Navigation {...navProps} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Pill header with accent color */}
        <div
          className="rounded-2xl p-8 mb-8"
          style={{ background: `${accentColor}12`, borderTop: `4px solid ${accentColor}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <span
              className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: accentColor, color: readableTextColor(accentColor), border: '1px solid rgba(0,0,0,0.12)' }}
            >
              {tContent('knowledgePill')}
            </span>
            <div className="flex items-center gap-3">
              <LikeButton
                contentId={pill.id}
                initialIsLiked={isLiked}
                initialCount={pill.likes_count ?? 0}
                isLoggedIn={!!user}
              />
              <BookmarkButton
                contentId={pill.id}
                initialIsBookmarked={isBookmarked}
                isLoggedIn={!!user}
              />
              <ShareButton title={t.title} slides={slidesToShare} className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-primary transition-colors" />
              <EditContentButton type="pill" contentId={pill.id} authorId={pill.author_id} userId={user?.id} role={navUserRole} className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-primary transition-colors" />
            </div>
          </div>
          {singleLanguage && <LanguageNotice sourceLocale={sourceLocale} subtitleLocales={pill.subtitle_locales} />}
          <h1 className="mb-4" style={{ color: '#2C2420' }}>{t.title}</h1>
          {pill.profiles && <AuthorByline author={pill.profiles} publishedAt={pill.published_at} locale={locale} />}
          {isCarousel ? (
            <PillCarousel slides={slides} label={t.title} />
          ) : (
            meta?.image_url && (
              <img src={meta.image_url} alt="" className="mx-auto h-auto max-h-96 w-auto max-w-full rounded-xl object-contain" />
            )
          )}
        </div>

        {isCarousel ? (
          <div className="mb-8 space-y-4">
            {t.excerpt && <p className="whitespace-pre-line text-base leading-relaxed text-[#2C2420]">{t.excerpt}</p>}
            {credits.length > 0 && (
              <div className="text-sm text-[#6B5F58]">
                <p className="mb-1 font-medium text-[#2C2420]">{tContent('imageCredits')}</p>
                <ul className="space-y-0.5">
                  {credits.map((c) => (
                    <li key={c.number}>{tContent('creditSlide', { n: c.number, credit: c.credit })}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <BodyTranslationLoader
            contentId={pill.id}
            locale={locale}
            isTranslating={needsBody}
            field="body"
            fallback={sourceBody}
            initialContent={body}
          />
        )}

        {topics.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/tag/${topic.slug}` as any}
                className="rounded-full px-3 py-1 text-sm text-black no-underline transition-colors hover:bg-[#A9A8E9]/40"
                style={{ border: '1.5px solid rgba(169,168,233,0.6)', background: '#fff' }}
              >
                {topic.name}
              </Link>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <ShareBar title={t.title} url={pillUrl} slides={slidesToShare} />
        </div>
      </main>
      <RelatedContent contentId={pill.id} type="pill" locale={locale} userId={user?.id} />
      <Footer />
    </>
  )
}
