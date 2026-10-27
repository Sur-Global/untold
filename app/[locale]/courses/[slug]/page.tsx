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
import { ArticleBody } from '@/components/content/ArticleBody'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'
import { ShareButton } from '@/components/social/ShareButton'
import { EditContentButton } from '@/components/content/EditContentButton'
import { TopicKicker } from '@/components/content/TopicKicker'
import { OtherTags } from '@/components/content/OtherTags'
import { loadContentTopics } from '@/lib/data/topics'
import { CourseView } from '@/components/courses/CourseView'
import type { CourseFact } from '@/components/courses/CourseParts'
import { LEVEL_KEYS, MODALITY_KEYS, STATUS_KEYS, extrasFromMeta, formatCourseDate, formatIntroSession, formatPrice, registrationTarget } from '@/lib/course-page'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  return loadContentMetadata({ type: 'course', slug, locale })
}

export default async function CoursePage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()
  const tContent = await getTranslations('content')
  const tp = await getTranslations('coursePage')

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
      id, slug, author_id, source_locale, single_language, subtitle_locales, cover_image_url, likes_count, published_at,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, excerpt, description, body, locale ),
      course_meta ( price, currency, duration, rating, banner_url, modality, place, starts_on, language_label, level, certificate, audience, price_note, provider_name, provider_url, registration_mode, registration_url, registration_label, registration_note, intro_sessions, intro_timezone, people ),
      content_tags ( tags ( slug, names, is_topic ) )
    `)
    .eq('slug', slug)
    .eq('type', 'course')
    .eq('status', 'published')
    .single()

  if (!course) notFound()

  // "Only available in this language" content is never translated: readers in any
  // language get the original, with a label (see LanguageNotice)
  const singleLanguage: boolean = !!course.single_language
  const contentLocale: string = singleLanguage ? (course.source_locale ?? 'en') : locale
  const t = getTranslation(course.content_translations ?? [], contentLocale)
  if (!t) notFound()
  const heading: string = t.title

  const meta = Array.isArray(course.course_meta) ? course.course_meta[0] : course.course_meta
  const extras = extrasFromMeta(meta)
  const author = course.profiles
  const topics = await loadContentTopics(supabase, (course.content_tags ?? []).map((ct: any) => ct.tags).filter(Boolean), locale)

  const sourceLocale: string = course.source_locale ?? 'en'
  const sourceTranslation = (course.content_translations ?? []).find((tr: any) => tr.locale === sourceLocale)
  const body = Array.isArray(t.body) && t.body.length > 0 ? (t.body as unknown[]) : null
  const subtitle: string | null = (t.excerpt as string | null) || null

  // A course made before the full description existed has a one-line description: shown as it was, translated on demand
  const sourceDescription = sourceTranslation?.description as string | null
  const usingFallback = t.locale !== contentLocale
  const description = usingFallback ? null : (t.description as string | null)
  const needsDescription = !body && contentLocale !== sourceLocale && !!sourceDescription && (usingFallback || !description)

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

  // What the page shows of the course
  const facts = [
    extras.modality && { id: 'modality', icon: 'modality', text: tp(MODALITY_KEYS[extras.modality]) },
    extras.place && { id: 'place', icon: 'place', text: extras.place },
    extras.startsOn && { id: 'starts', icon: 'starts', text: `${tp('startsLabel')}: ${formatCourseDate(extras.startsOn, locale)}` },
    meta?.duration && { id: 'duration', icon: 'duration', text: meta.duration },
    extras.languageLabel && { id: 'language', icon: 'language', text: extras.languageLabel },
    extras.level && { id: 'level', icon: 'level', text: tp(LEVEL_KEYS[extras.level]) },
    extras.certificate && { id: 'certificate', icon: 'certificate', text: tp('certificate') },
  ].filter(Boolean) as CourseFact[]
  const target = registrationTarget(extras)

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <CourseView
          notice={singleLanguage ? <LanguageNotice sourceLocale={sourceLocale} subtitleLocales={course.subtitle_locales} /> : undefined}
          kicker={<TopicKicker primary={topics.primary} related={topics.related} exploreAlso={tContent('exploreAlso')} className="mb-4" />}
          heading={heading}
          subtitle={subtitle}
          bannerImage={extras.bannerUrl || course.cover_image_url || null}
          providerName={extras.providerName}
          providerUrl={extras.providerUrl}
          facts={facts}
          actions={
            <div className="flex items-center gap-3">
              <LikeButton contentId={course.id} initialIsLiked={isLiked} initialCount={course.likes_count ?? 0} isLoggedIn={!!user} />
              <BookmarkButton contentId={course.id} initialIsBookmarked={isBookmarked} isLoggedIn={!!user} />
              <ShareButton title={t.title} className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-primary transition-colors" />
              <EditContentButton type="course" contentId={course.id} authorId={course.author_id} userId={user?.id} role={navUserRole} className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-primary transition-colors" />
            </div>
          }
          audience={extras.audience}
          people={extras.people}
          content={
            body ? (
              <ArticleBody json={body} />
            ) : (
              <BodyTranslationLoader
                contentId={course.id}
                locale={locale}
                isTranslating={needsDescription}
                field="description"
                fallback={sourceDescription}
                initialContent={description}
                descriptionClassName="text-[#6B5F58] leading-relaxed text-lg"
              />
            )
          }
          registration={{
            note: extras.registrationNote || tp('introNote'),
            sessions: extras.introSessions.map((s) => ({ ...formatIntroSession(s, locale), status: s.status })),
            timezone: extras.introTimezone,
            href: target?.href ?? null,
            embedUrl: target?.embedUrl ?? null,
            label: extras.registrationLabel || tp('register'),
          }}
          tags={<OtherTags tags={topics.others} label={tContent('otherTags')} className="mt-2" />}
          price={formatPrice(meta?.price, meta?.currency, locale)}
          priceNote={extras.priceNote}
          authorName={author?.display_name}
          rating={meta?.rating}
          labels={{
            facts: tp('facts'), provider: tp('providerLabel'), instructor: tContent('instructor'), price: tp('priceLabel'), free: tp('free'), intro: tp('introTitle'), audience: tp('audienceTitle'),
            people: tp('peopleTitle'), groups: { teacher: tp('teachersTitle'), facilitator: tp('facilitatorsTitle') }, viewProfile: tp('viewProfile'),
            status: { open: tp(STATUS_KEYS.open), few: tp(STATUS_KEYS.few), full: tp(STATUS_KEYS.full) },
            formTitle: tp('formTitle'), openForm: tp('openForm'), noForm: tp('noForm'), enrollSoon: tContent('enrollSoon'), enrollSoonTitle: tContent('enrollSoonTitle'), rating: tContent('rating'),
          }}
        />
      </main>
      <RelatedContent contentId={course.id} type="course" locale={locale} userId={user?.id} />
      <Footer />
    </>
  )
}
