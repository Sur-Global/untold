import { after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { loadAllTopics } from '@/lib/data/topics'
import { triggerTagTranslations } from '@/lib/trigger-tag-translations'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

/** All the topics (the tags the editors chose as the themes of the site), A to Z, each with how much content it has */
export default async function TopicsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()
  const [{ userId, ...navProps }, topics, t, tTag] = await Promise.all([
    getNavProps(),
    loadAllTopics(supabase, locale),
    getTranslations('topics'),
    getTranslations('tag'),
  ])
  after(() => triggerTagTranslations(locale))

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <h1 className="mb-2">{t('title')}</h1>
          <p className="max-w-2xl text-[#6B5F58]">{t('description')}</p>
        </div>

        {topics.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <li key={topic.slug}>
                <Link
                  href={`/tag/${topic.slug}` as any}
                  className="flex h-full flex-col justify-between rounded-2xl border border-black/10 bg-white px-6 py-5 no-underline transition-colors hover:bg-[#A9A8E9]/30"
                >
                  <span className="block text-2xl text-black first-letter:uppercase" style={{ ...aeonik, fontWeight: 500, letterSpacing: '-0.01em' }}>{topic.name}</span>
                  <span className="mt-6 font-mono text-sm text-[#6B5F58]">{tTag('contentCount', { count: topic.count })}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-20 text-center text-[#6B5F58]">{t('empty')}</p>
        )}
      </main>
      <Footer />
    </>
  )
}
