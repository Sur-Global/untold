import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { BodyTranslationLoader } from '@/components/content/BodyTranslationLoader'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function CoursePage({ params }: PageProps) {
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

  const { data: course } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, cover_image_url, likes_count, published_at,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, description, locale ),
      course_meta ( price, currency, duration, students_count, rating )
    `)
    .eq('slug', slug)
    .eq('type', 'course')
    .eq('status', 'published')
    .single()

  if (!course) notFound()

  const t = getTranslation(course.content_translations ?? [], locale)
  if (!t) notFound()

  const meta = course.course_meta
  const author = course.profiles

  const enTranslation = (course.content_translations ?? []).find((tr: any) => tr.locale === 'en')
  const englishDescription = enTranslation?.description as string | null
  const needsDescription = locale !== 'en' && !!englishDescription && !t.description

  if (needsDescription) {
    after(async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
          },
          body: JSON.stringify({ contentId: course.id, locale }),
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
        .eq('user_id', user.id).eq('content_id', course.id).maybeSingle(),
      (supabase as any)
        .from('bookmarks').select('user_id')
        .eq('user_id', user.id).eq('content_id', course.id).maybeSingle(),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid md:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="md:col-span-2">
            {course.cover_image_url && (
              <img
                src={course.cover_image_url}
                alt={t.title}
                className="w-full rounded-xl mb-8 aspect-video object-cover"
              />
            )}
            <h1 className="mb-4">{t.title}</h1>
            <BodyTranslationLoader
              contentId={course.id}
              locale={locale}
              isTranslating={needsDescription}
              field="description"
              fallback={englishDescription}
              initialContent={t.description ?? null}
            >
              {(content) => <p className="text-[#6B5F58] leading-relaxed text-lg">{content as string}</p>}
            </BodyTranslationLoader>
            <div className="flex items-center gap-3 mt-4">
              <LikeButton
                contentId={course.id}
                initialIsLiked={isLiked}
                initialCount={course.likes_count ?? 0}
                isLoggedIn={!!user}
              />
              <BookmarkButton
                contentId={course.id}
                initialIsBookmarked={isBookmarked}
                isLoggedIn={!!user}
              />
            </div>
          </div>

          {/* Course info sidebar */}
          <div
            className="rounded-xl p-6 h-fit"
            style={{ background: '#FAF7F2', border: '1px solid rgba(139,69,19,0.12)', boxShadow: '0 4px 16px rgba(44,36,32,0.08)' }}
          >
            {/* Price */}
            {meta && (
              <p className="text-2xl font-mono font-bold text-[#A0522D] mb-4">
                {meta.price === 0 ? 'Free' : meta.currency ? `${meta.currency} ${meta.price}` : String(meta.price)}
              </p>
            )}

            <button
              disabled
              className="w-full py-3 rounded-lg font-mono text-sm font-semibold mb-4 cursor-not-allowed"
              style={{ background: 'rgba(139,69,19,0.3)', color: 'rgba(255,255,255,0.6)' }}
              title="Enrollment coming soon"
            >
              Enroll Now — Coming Soon
            </button>

            <div className="space-y-3 text-sm font-mono text-[#6B5F58]">
              {meta?.duration && <div className="flex justify-between"><span>Duration</span><span>{meta.duration}</span></div>}
              {meta?.students_count != null && <div className="flex justify-between"><span>Students</span><span>{meta.students_count}</span></div>}
              {meta?.rating != null && <div className="flex justify-between"><span>Rating</span><span>★ {meta.rating.toFixed(1)}</span></div>}
              {author && (
                <div className="flex justify-between">
                  <span>Instructor</span>
                  <span>{author.display_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
