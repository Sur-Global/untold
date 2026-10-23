import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { CreatorCard } from '@/components/creators/CreatorCard'
import { CreatorsFilters } from '@/components/creators/CreatorsFilters'
import { countryName } from '@/lib/countries'
import {
  CONTENT_KINDS,
  availableLetters,
  filterCreators,
  parseCreatorQuery,
  plainBio,
  type ContentKind,
  type Creator,
} from '@/lib/creators'

const aeonik = (weight: 300 | 400 | 500): React.CSSProperties => ({
  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  fontWeight: weight,
})

// UNTOLD's own editorial profile is the publication, not a creator
const HIDDEN_SLUGS = new Set(['untold'])

export default async function CreatorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const query = parseCreatorQuery(await searchParams)
  const [t, supabase, navData] = await Promise.all([getTranslations('creators'), createClient(), getNavProps()])
  const { userId: _userId, ...navProps } = navData

  // Everything published on the general pages (plus issue editorials, which live under Issues), with its topics
  const { data: rows } = await (supabase as any)
    .from('content')
    .select('author_id, type, is_editorial, published_at, content_tags ( tags ( slug, names ) )')
    .eq('status', 'published')
    .or('is_curated.eq.true,is_editorial.eq.true')
    .limit(5000)

  type Acc = { counts: Record<ContentKind, number>; last: string | null; tags: Set<string> }
  const byAuthor = new Map<string, Acc>()
  const topicNames = new Map<string, string>()
  const topicCreators = new Map<string, Set<string>>()
  for (const row of rows ?? []) {
    if (!row.author_id) continue
    const acc = byAuthor.get(row.author_id) ?? { counts: { article: 0, editorial: 0, video: 0, podcast: 0, pill: 0, course: 0 }, last: null, tags: new Set<string>() }
    const kind = row.is_editorial ? 'editorial' : row.type
    if (kind in acc.counts) acc.counts[kind as ContentKind]++
    if (row.published_at && (!acc.last || row.published_at > acc.last)) acc.last = row.published_at
    for (const ct of row.content_tags ?? []) {
      const tag = ct.tags
      if (!tag) continue
      acc.tags.add(tag.slug)
      topicNames.set(tag.slug, tag.names?.[locale] ?? tag.names?.en ?? tag.slug)
      topicCreators.set(tag.slug, (topicCreators.get(tag.slug) ?? new Set()).add(row.author_id))
    }
    byAuthor.set(row.author_id, acc)
  }

  const { data: profiles } = byAuthor.size
    ? await (supabase as any)
        .from('profiles')
        .select('id, slug, display_name, avatar_url, bio, countries, profile_translations, suspended_at')
        .in('id', [...byAuthor.keys()])
    : { data: [] }

  const creators: Creator[] = (profiles ?? [])
    .filter((p: any) => !p.suspended_at && !HIDDEN_SLUGS.has(p.slug) && p.display_name)
    .map((p: any) => {
      const acc = byAuthor.get(p.id)!
      const translated = p.profile_translations?.[locale]?.bio
      return {
        id: p.id,
        slug: p.slug,
        name: p.display_name,
        avatarUrl: p.avatar_url ?? null,
        bio: plainBio(translated || p.bio),
        countries: p.countries ?? [],
        counts: acc.counts,
        total: CONTENT_KINDS.reduce((n, k) => n + acc.counts[k], 0),
        lastPublishedAt: acc.last,
        tags: [...acc.tags],
      }
    })

  // Choices offered by the filters: only what at least one creator has
  const countries = [...new Set(creators.flatMap((c) => c.countries))]
    .map((code) => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale))
  const topics = [...topicCreators.entries()]
    .filter(([, who]) => who.size >= 2)
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .slice(0, 40)
    .map(([slug]) => ({ slug, name: topicNames.get(slug) ?? slug }))
    .sort((a, b) => a.name.localeCompare(b.name, locale))

  const shown = filterCreators(creators, query, locale)
  const countsLabel = (c: Creator) =>
    CONTENT_KINDS.filter((k) => c.counts[k] > 0)
      .map((k) => t(k, { count: c.counts[k] }))
      .join(' · ')

  return (
    <>
      <Navigation {...navProps} />
      <main className="bg-background min-h-screen">
        <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="mx-auto max-w-[1280px] px-6 pb-10 pt-16">
            <div className="mb-10 text-center">
              <h1 className="mb-4 text-foreground" style={{ ...aeonik(500), fontSize: 'clamp(36px, 6vw, 56px)', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                {t('title')}
              </h1>
              <p className="mx-auto max-w-[745px] text-lg leading-[1.56]" style={{ ...aeonik(300), color: '#555' }}>
                {t('description')}
              </p>
            </div>
            <Suspense>
              <CreatorsFilters
                labels={{
                  searchPlaceholder: t('searchPlaceholder'),
                  searchLabel: t('searchLabel'),
                  sortLabel: t('sortLabel'),
                  sortAz: t('sortAz'),
                  sortContent: t('sortContent'),
                  sortRecent: t('sortRecent'),
                  countryLabel: t('countryLabel'),
                  countryAll: t('countryAll'),
                  topicLabel: t('topicLabel'),
                  topicAll: t('topicAll'),
                  letterLabel: t('letterLabel'),
                  letterAll: t('letterAll'),
                  clear: t('clear'),
                }}
                countries={countries}
                topics={topics}
                letters={availableLetters(creators)}
              />
            </Suspense>
          </div>
        </div>

        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <p className="mb-6 text-sm" style={{ ...aeonik(300), color: '#777' }} aria-live="polite">
            {t('results', { count: shown.length })}
          </p>
          {shown.length === 0 ? (
            <p className="py-20 text-center text-sm" style={{ ...aeonik(300), color: '#999' }}>
              {t('noResults')}
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((c) => (
                <CreatorCard
                  key={c.id}
                  slug={c.slug}
                  name={c.name}
                  avatarUrl={c.avatarUrl}
                  country={c.countries.length > 0 ? c.countries.map((code) => countryName(code, locale)).join(' · ') : null}
                  bio={c.bio}
                  countsLabel={countsLabel(c)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
