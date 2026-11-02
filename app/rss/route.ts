import { createClient } from '@supabase/supabase-js'
import { routing } from '@/i18n/routing'
import { localizedPath, siteUrl, SITE_NAME } from '@/lib/content-metadata'
import { buildRss } from '@/lib/rss'

export const dynamic = 'force-dynamic'

// The old Ghost site had its feed at /rss/ and its texts are in Spanish: /rss is the Spanish feed, /rss?lang=en the English one
const DEFAULT_FEED_LANGUAGE = 'es'
const ITEMS = 30

export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get('lang') ?? ''
  const locale = (routing.locales as readonly string[]).includes(asked) ? asked : DEFAULT_FEED_LANGUAGE
  const base = siteUrl()

  const supabase: any = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase
    .from('content')
    .select('slug, source_locale, published_at, profiles!author_id ( display_name ), content_translations ( locale, title, excerpt, featured_summary )')
    .eq('type', 'article')
    .eq('status', 'published')
    .eq('is_curated', true)
    .order('published_at', { ascending: false })
    .limit(ITEMS)
  if (error) return new Response('Feed unavailable', { status: 503 })

  const items = (data ?? []).flatMap((row: any) => {
    const translations: any[] = row.content_translations ?? []
    const text = translations.find((t) => t.locale === locale) ?? translations.find((t) => t.locale === row.source_locale) ?? translations[0]
    if (!text?.title || !row.published_at) return []
    const shownLocale = translations.some((t) => t.locale === locale) ? locale : row.source_locale
    return [
      {
        title: text.title as string,
        link: base + localizedPath(shownLocale, `/articles/${row.slug}`),
        summary: (text.excerpt || text.featured_summary || null) as string | null,
        publishedAt: row.published_at as string,
        author: (row.profiles?.display_name ?? null) as string | null,
      },
    ]
  })

  const body = buildRss({
    title: SITE_NAME,
    link: base,
    selfLink: `${base}/rss${locale === DEFAULT_FEED_LANGUAGE ? '' : `?lang=${locale}`}`,
    description: SITE_NAME,
    language: locale,
    items,
  })
  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  })
}
