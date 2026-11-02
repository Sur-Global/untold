import { describe, it, expect, vi } from 'vitest'
import ghost from '@/lib/ghost-redirects.json'
import { legacyRedirects } from '@/next.config'
import { routing } from '@/i18n/routing'
import { RESERVED_STATIC_PAGE_SLUGS } from '@/lib/static-pages/reserved-slugs'

// the config file wraps itself with the translation plugin when it is loaded: here only its redirects matter
vi.mock('next-intl/plugin', () => ({ default: () => (config: unknown) => config }))

describe('redirects from the old Ghost site', () => {
  const redirects = legacyRedirects()
  const posts = redirects.filter((r) => r.destination.startsWith('/es/articles/'))

  it('sends every old post to the Spanish article with the same slug', () => {
    expect(posts).toHaveLength(64)
    for (const r of posts) expect(r.destination).toBe(`/es/articles/${r.source.slice(1)}`)
  })

  it('is permanent everywhere, so search engines move to the new addresses', () => {
    expect(redirects.every((r) => r.permanent)).toBe(true)
  })

  it('has no address twice and no chains (a destination that is itself redirected)', () => {
    const sources = redirects.map((r) => r.source)
    expect(new Set(sources).size).toBe(sources.length)
    for (const r of redirects) expect(sources).not.toContain(r.destination)
  })

  it('never takes over a language, a section of the site or a page of the site', () => {
    const taken = new Set([...routing.locales, ...RESERVED_STATIC_PAGE_SLUGS, 'about', 'issues', 'creators', 'rss', 'sitemap.xml', 'robots.txt'])
    for (const r of posts) expect(taken.has(r.source.slice(1))).toBe(false)
  })

  it('renames the tags whose address changed (and only those)', () => {
    const tags = Object.fromEntries(redirects.filter((r) => /^\/tag\/[a-z-]+$/.test(r.source)).map((r) => [r.source, r.destination]))
    expect(tags).toEqual({
      '/tag/ai': '/tag/inteligencia-artificial',
      '/tag/aicapitalism': '/tag/inteligencia-artificial',
      '/tag/behaviorual-design': '/tag/diseno-conductual',
      '/tag/futures': '/tag/futuros',
      '/tag/research': '/tag/investigacion',
      '/tag/resistecia': '/tag/resistencia',
      '/tag/tech': '/tag/tecnologia',
    })
  })

  it('knows every old address: 64 posts, 43 tags (7 renamed, 36 unchanged) and the About page', () => {
    expect(ghost.posts).toHaveLength(64)
    expect(Object.keys(ghost.tags)).toHaveLength(7)
    expect(ghost.tagsUnchanged).toHaveLength(36)
    expect(ghost.pages).toEqual(['about'])
  })
})
