import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ArticleBody } from '@/components/content/ArticleBody'
import { BodyTranslationLoader } from '@/components/content/BodyTranslationLoader'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function PillPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()

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
      id, slug, likes_count, published_at,
      profiles!author_id ( display_name, slug ),
      content_translations ( title, body, locale ),
      pill_meta ( accent_color, image_url )
    `)
    .eq('slug', slug)
    .eq('type', 'pill')
    .eq('status', 'published')
    .single()

  if (!pill) notFound()

  const t = getTranslation(pill.content_translations ?? [], locale)
  if (!t) notFound()

  const meta = pill.pill_meta
  const accentColor = meta?.accent_color ?? '#6B8E23'
  const body = t.body as Record<string, unknown> | null

  const enTranslation = (pill.content_translations ?? []).find((tr: any) => tr.locale === 'en')
  const englishBody = enTranslation?.body as Record<string, unknown> | null
  const needsBody = locale !== 'en' && !!englishBody && !body

  if (needsBody) {
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
              style={{ background: `${accentColor}20`, color: accentColor }}
            >
              Knowledge Pill
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
            </div>
          </div>
          <h1 className="mb-4" style={{ color: '#2C2420' }}>{t.title}</h1>
          {meta?.image_url && (
            <img src={meta.image_url} alt="" className="w-full rounded-xl object-cover max-h-48" />
          )}
        </div>

        <BodyTranslationLoader
          contentId={pill.id}
          locale={locale}
          isTranslating={needsBody}
          field="body"
          fallback={englishBody}
          initialContent={body}
        >
          {(content) => <ArticleBody json={content as Record<string, unknown>} />}
        </BodyTranslationLoader>
      </main>
      <Footer />
    </>
  )
}
