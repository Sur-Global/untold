import type { MetadataRoute } from 'next'
import { localizedPath } from '@/lib/content-metadata'

export interface SitemapContent {
  slug: string
  type: string
  sourceLocale: string
  singleLanguage: boolean
  updatedAt: string | null
  /** languages the text exists in */
  translationLocales: string[]
}

export interface SitemapInput {
  /** https://www.untold.ink (no trailing slash) */
  base: string
  /** languages switched on (Admin → Settings → Languages) */
  locales: string[]
  defaultLocale: string
  content: SitemapContent[]
  tags: string[]
  authors: { slug: string; updatedAt: string | null }[]
  /** addresses of the numbered issues, e.g. /issues/2026/9 */
  issues: string[]
  pages: { slug: string; locales: string[] }[]
}

const SECTION_OF_TYPE: Record<string, string> = { article: '/articles', video: '/videos', podcast: '/podcasts', pill: '/pills', course: '/courses' }
/** The lists of the site, besides the home page */
export const LIST_PAGES = ['/articles', '/videos', '/podcasts', '/pills', '/courses', '/creators', '/topics', '/issues']

/** One entry per language of a page; each says where the same page is in the other languages */
function entries(base: string, path: string, locales: string[], defaultLocale: string, lastModified?: string | null): MetadataRoute.Sitemap {
  const urlOf = (locale: string) => base + (localizedPath(locale, path) || '/')
  const languages = locales.length > 1 ? { ...Object.fromEntries(locales.map((l) => [l, urlOf(l)])), 'x-default': urlOf(locales.includes(defaultLocale) ? defaultLocale : locales[0]) } : undefined
  return locales.map((locale) => ({
    url: urlOf(locale),
    ...(lastModified ? { lastModified } : {}),
    ...(languages ? { alternates: { languages } } : {}),
  }))
}

/** The addresses search engines should know: only public pages, once per language the page really exists in */
export function buildSitemap({ base, locales, defaultLocale, content, tags, authors, issues, pages }: SitemapInput): MetadataRoute.Sitemap {
  const on = (wanted: string[]) => {
    const kept = [...new Set(wanted)].filter((l) => locales.includes(l))
    return kept.length ? kept : locales.includes(defaultLocale) ? [defaultLocale] : locales.slice(0, 1)
  }
  const out: MetadataRoute.Sitemap = []

  for (const path of ['', ...LIST_PAGES]) out.push(...entries(base, path, locales, defaultLocale))

  for (const c of content) {
    const section = SECTION_OF_TYPE[c.type]
    if (!section) continue
    const languages = c.singleLanguage ? [c.sourceLocale] : [c.sourceLocale, ...c.translationLocales]
    out.push(...entries(base, `${section}/${c.slug}`, on(languages), defaultLocale, c.updatedAt))
  }
  for (const slug of tags) out.push(...entries(base, `/tag/${slug}`, locales, defaultLocale))
  for (const a of authors) out.push(...entries(base, `/author/${a.slug}`, locales, defaultLocale, a.updatedAt))
  for (const path of issues) out.push(...entries(base, path, locales, defaultLocale))
  for (const p of pages) out.push(...entries(base, `/${p.slug}`, on(p.locales), defaultLocale))
  return out
}
