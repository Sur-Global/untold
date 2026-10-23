import { after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { triggerListingTranslations } from '@/lib/trigger-listing-translations'
import { editorialTexts } from '@/lib/data/issue-editorial'
import { issueLabel, issueMonthName, issuePath, issueYear } from '@/lib/issues'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { TranslationRefresher } from '@/components/TranslationRefresher'
import { Link } from '@/i18n/navigation'

const aeonik = (weight: 300 | 400 | 500): React.CSSProperties => ({
  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  fontWeight: weight,
})

export default async function IssuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, supabase, navData] = await Promise.all([getTranslations('issues'), createClient(), getNavProps()])
  const { userId: _userId, ...navProps } = navData

  const { data: issues } = await (supabase as any)
    .from('issues')
    .select(`
      id, number, issue_date, status,
      editorial:content!issues_editorial_id_fkey (
        id, slug, source_locale, single_language, status,
        profiles!author_id ( display_name, slug, avatar_url ),
        content_translations ( title, excerpt, featured_summary, locale )
      )
    `)
    .eq('status', 'published')
    .order('issue_date', { ascending: false })
    .order('number', { ascending: false })

  const { data: members } = await (supabase as any)
    .from('content')
    .select('issue_id')
    .eq('status', 'published')
    .in('issue_id', (issues ?? []).map((i: any) => i.id))
  const counts = new Map<string, number>()
  for (const m of members ?? []) counts.set(m.issue_id, (counts.get(m.issue_id) ?? 0) + 1)

  const editorials = (issues ?? []).map((i: any) => i.editorial).filter((e: any) => e && e.status === 'published')
  const texts = await editorialTexts(supabase, editorials, locale)

  const untranslated = editorials
    .filter((e: any) => !e.single_language && !(e.content_translations ?? []).some((tr: any) => tr.locale === locale))
    .map((e: any) => e.id)
  if (untranslated.length > 0) after(() => triggerListingTranslations(untranslated, locale))

  return (
    <>
      <TranslationRefresher pending={untranslated.length > 0} />
      <Navigation {...navProps} />
      <main className="bg-background min-h-screen">
        <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="mx-auto max-w-[1280px] px-6 pb-10 pt-16 text-center">
            <h1 className="mb-4 text-foreground" style={{ ...aeonik(500), fontSize: 'clamp(36px, 6vw, 56px)', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              {t('title')}
            </h1>
            <p className="mx-auto max-w-[745px] text-lg leading-[1.56]" style={{ ...aeonik(300), color: '#555' }}>
              {t('description')}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[1280px] space-y-6 px-6 py-12">
          {(issues ?? []).length === 0 && (
            <p className="py-24 text-center text-sm" style={{ ...aeonik(300), color: '#999' }}>
              {t('empty')}
            </p>
          )}
          {(issues ?? []).map((issue: any) => {
            const editorial = issue.editorial && issue.editorial.status === 'published' ? issue.editorial : null
            const text = editorial ? texts.get(editorial.id) : null
            const count = counts.get(issue.id) ?? 0
            return (
              <Link
                key={issue.id}
                href={editorial ? `/articles/${editorial.slug}` : issuePath(issue.issue_date)}
                aria-label={issueLabel(issue.issue_date, locale)}
                className="grid gap-6 rounded-2xl border border-black/10 bg-white p-6 no-underline transition-shadow hover:shadow-lg md:grid-cols-[1fr_2.2fr] md:p-8"
                style={{ color: '#000' }}
              >
                <div className="flex flex-col justify-center rounded-xl p-6" style={{ background: '#000', color: '#fff' }}>
                  <p style={{ ...aeonik(500), fontSize: 'clamp(30px, 3.4vw, 40px)', lineHeight: 1, letterSpacing: '-0.03em', color: '#D2FE73', overflowWrap: 'anywhere' }}>
                    {issueMonthName(issue.issue_date, locale)}
                  </p>
                  <p className="mt-2" style={{ ...aeonik(300), fontSize: 16, color: '#C9C4BD' }}>
                    {issueYear(issue.issue_date)}
                  </p>
                </div>
                <div className="flex flex-col justify-center">
                  {text ? (
                    <>
                      <h2 className="mb-2" style={{ ...aeonik(500), fontSize: 24, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                        {text.title}
                      </h2>
                      {text.excerpt && (
                        <p className="line-clamp-4 text-[15px] leading-relaxed" style={{ ...aeonik(300), color: '#444' }}>
                          {text.excerpt}
                        </p>
                      )}
                      {editorial?.profiles?.display_name && (
                        <p className="mt-3 text-sm" style={{ ...aeonik(400), color: '#333' }}>
                          {editorial.profiles.display_name}
                        </p>
                      )}
                    </>
                  ) : null}
                  <p className="mt-4 text-sm" style={{ ...aeonik(500), color: '#6b6ad0' }}>
                    {t('articles', { count })} →
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
      <Footer />
    </>
  )
}
