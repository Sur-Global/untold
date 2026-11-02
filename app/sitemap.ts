import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { routing } from '@/i18n/routing'
import { siteUrl } from '@/lib/content-metadata'
import { issuePath } from '@/lib/issues'
import { mergePlatformSettings } from '@/lib/platform-settings/defaults'
import { buildSitemap } from '@/lib/sitemap'

// Read when asked, not when the site is built: it always lists what is published at that moment
export const dynamic = 'force-dynamic'

/** The profile the magazine publishes under: its page is not a creator's page */
const HIDDEN_SLUGS = new Set(['untold'])

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The public key, like a visitor: only what a visitor can see can be listed
  const supabase: any = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const [settings, content, issues, pages] = await Promise.all([
    supabase.from('platform_settings').select('settings').eq('id', 'default').maybeSingle(),
    supabase
      .from('content')
      .select('slug, type, source_locale, single_language, updated_at, author_id, content_translations ( locale ), content_tags ( tags ( slug ) )')
      .eq('status', 'published')
      .or('is_curated.eq.true,is_editorial.eq.true')
      .limit(5000),
    supabase.from('issues').select('issue_date').eq('status', 'published'),
    supabase.from('static_pages').select('slug, static_page_translations ( locale )').eq('status', 'published'),
  ])
  // A read that failed must not publish a sitemap that looks complete
  for (const r of [content, issues, pages]) if (r.error) throw new Error(`sitemap: ${r.error.message}`)

  const rows: any[] = content.data ?? []
  const authorIds = [...new Set(rows.map((r) => r.author_id).filter(Boolean))]
  const { data: profiles } = authorIds.length
    ? await supabase.from('profiles').select('id, slug, display_name, suspended_at, hidden').in('id', authorIds)
    : { data: [] }
  const lastByAuthor = new Map<string, string>()
  for (const r of rows) if (r.updated_at && (lastByAuthor.get(r.author_id) ?? '') < r.updated_at) lastByAuthor.set(r.author_id, r.updated_at)

  return buildSitemap({
    base: siteUrl(),
    locales: mergePlatformSettings(settings.data?.settings).languages.enabled,
    defaultLocale: routing.defaultLocale,
    content: rows.map((r) => ({
      slug: r.slug,
      type: r.type,
      sourceLocale: r.source_locale,
      singleLanguage: !!r.single_language,
      updatedAt: r.updated_at ?? null,
      translationLocales: (r.content_translations ?? []).map((t: any) => t.locale),
    })),
    tags: [...new Set(rows.flatMap((r) => (r.content_tags ?? []).map((ct: any) => ct.tags?.slug).filter(Boolean)))] as string[],
    authors: (profiles ?? [])
      .filter((p: any) => p.slug && p.display_name && !p.suspended_at && !p.hidden && !HIDDEN_SLUGS.has(p.slug))
      .map((p: any) => ({ slug: p.slug, updatedAt: lastByAuthor.get(p.id) ?? null })),
    issues: (issues.data ?? []).map((i: any) => issuePath(i.issue_date)),
    pages: (pages.data ?? []).map((p: any) => ({ slug: p.slug, locales: (p.static_page_translations ?? []).map((t: any) => t.locale) })),
  })
}
