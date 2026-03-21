import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function CoursePage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()
  const navProps = await getNavProps()

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
            {t.description && (
              <p className="text-[#6B5F58] leading-relaxed text-lg">{t.description}</p>
            )}
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
              className="w-full py-3 rounded-lg font-mono text-sm font-semibold text-white mb-4"
              style={{ background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)' }}
            >
              Enroll Now
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
