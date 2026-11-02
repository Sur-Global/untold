import { describe, it, expect } from 'vitest'
import { buildSitemap, type SitemapInput } from '@/lib/sitemap'
import { buildRss } from '@/lib/rss'

const base = 'https://www.untold.ink'
const input = (over: Partial<SitemapInput> = {}): SitemapInput => ({
  base,
  locales: ['en', 'es', 'pt'],
  defaultLocale: 'en',
  content: [],
  tags: [],
  authors: [],
  issues: [],
  pages: [],
  ...over,
})
const urls = (s: ReturnType<typeof buildSitemap>) => s.map((e) => e.url)

describe('sitemap', () => {
  it('lists the home page and the lists once per language, English without a prefix', () => {
    const list = urls(buildSitemap(input()))
    expect(list).toContain(`${base}/`)
    expect(list).toContain(`${base}/es`)
    expect(list).toContain(`${base}/articles`)
    expect(list).toContain(`${base}/pt/courses`)
  })

  it('lists an article only in the languages it exists in, each saying where the others are', () => {
    const s = buildSitemap(input({ content: [{ slug: 'a', type: 'article', sourceLocale: 'es', singleLanguage: false, updatedAt: '2026-10-01T00:00:00Z', translationLocales: ['es', 'en'] }] }))
    const mine = s.filter((e) => e.url.includes('/articles/a'))
    expect(mine.map((e) => e.url).sort()).toEqual([`${base}/articles/a`, `${base}/es/articles/a`])
    expect(mine[0].alternates?.languages).toEqual({ en: `${base}/articles/a`, es: `${base}/es/articles/a`, 'x-default': `${base}/articles/a` })
    expect(mine[0].lastModified).toBe('2026-10-01T00:00:00Z')
  })

  it('lists a single-language item only in its own language, and skips languages that are switched off', () => {
    const s = buildSitemap(
      input({
        locales: ['en', 'es'],
        content: [
          { slug: 'v', type: 'video', sourceLocale: 'pt', singleLanguage: true, updatedAt: null, translationLocales: ['pt', 'en'] },
          { slug: 'p', type: 'pill', sourceLocale: 'es', singleLanguage: false, updatedAt: null, translationLocales: ['es', 'pt'] },
        ],
      }),
    )
    // portuguese is off: the video falls back to the default language rather than disappearing
    expect(urls(s).filter((u) => u.includes('/videos/v'))).toEqual([`${base}/videos/v`])
    expect(urls(s).filter((u) => u.includes('/pills/p'))).toEqual([`${base}/es/pills/p`])
  })

  it('knows where each kind of content lives and ignores unknown kinds', () => {
    const s = buildSitemap(
      input({
        locales: ['en'],
        content: ['article', 'video', 'podcast', 'pill', 'course', 'mystery'].map((type) => ({ slug: `x-${type}`, type, sourceLocale: 'en', singleLanguage: false, updatedAt: null, translationLocales: ['en'] })),
      }),
    )
    expect(urls(s).filter((u) => u.includes('/x-'))).toEqual(['articles', 'videos', 'podcasts', 'pills', 'courses'].map((d) => `${base}/${d}/x-${d.slice(0, -1)}`))
  })

  it('adds tags, creators, issues and pages', () => {
    const list = urls(buildSitemap(input({ locales: ['en', 'es'], tags: ['urbanismo'], authors: [{ slug: 'ana', updatedAt: null }], issues: ['/issues/2026/9'], pages: [{ slug: 'about', locales: ['en', 'es'] }] })))
    for (const u of ['/tag/urbanismo', '/es/tag/urbanismo', '/author/ana', '/es/author/ana', '/issues/2026/9', '/about', '/es/about']) expect(list).toContain(base + u)
  })

  it('gives no alternates when only one language is on', () => {
    expect(buildSitemap(input({ locales: ['en'] })).every((e) => !e.alternates)).toBe(true)
  })
})

describe('rss feed', () => {
  it('escapes text and lists every item with its address, date and author', () => {
    const xml = buildRss({
      title: 'UNTOLD',
      link: base,
      selfLink: `${base}/rss`,
      description: 'UNTOLD',
      language: 'es',
      items: [{ title: 'Tom & "Jerry" <b>', link: `${base}/es/articles/a`, summary: 'Uno & dos', publishedAt: '2026-09-13T08:31:00.000+00:00', author: 'Ana' }],
    })
    expect(xml).toContain('<title>Tom &amp; &quot;Jerry&quot; &lt;b&gt;</title>')
    expect(xml).toContain(`<guid isPermaLink="true">${base}/es/articles/a</guid>`)
    expect(xml).toContain('<pubDate>Sun, 13 Sep 2026 08:31:00 GMT</pubDate>')
    expect(xml).toContain('<dc:creator>Ana</dc:creator>')
    expect(xml).toContain('<description>Uno &amp; dos</description>')
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })
})
