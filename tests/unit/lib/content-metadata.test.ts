import { describe, it, expect, afterEach } from 'vitest'
import { contentMetadata, localizedPath, siteUrl, DEFAULT_SHARE_IMAGE } from '@/lib/content-metadata'

describe('contentMetadata (what a shared link shows)', () => {
  const base = { locale: 'es', path: '/articles/amazofuturismo', title: 'Amazofuturismo', description: 'Un resumen.', image: 'https://cdn/cover.webp', publishedAt: '2026-05-01T00:00:00Z', authorName: 'Ana' }

  it('gives title, summary, address and picture to Open Graph and to X', () => {
    const m = contentMetadata(base) as any
    expect(m.title).toBe('Amazofuturismo — UNTOLD')
    expect(m.description).toBe('Un resumen.')
    expect(m.openGraph).toMatchObject({ type: 'article', siteName: 'UNTOLD.ink', title: 'Amazofuturismo', url: '/es/articles/amazofuturismo', locale: 'es_ES', publishedTime: '2026-05-01T00:00:00Z', authors: ['Ana'] })
    expect(m.openGraph.images).toEqual([{ url: 'https://cdn/cover.webp', alt: 'Amazofuturismo' }])
    expect(m.twitter).toMatchObject({ card: 'summary_large_image', title: 'Amazofuturismo', images: ['https://cdn/cover.webp'] })
    expect(m.alternates.canonical).toBe('/es/articles/amazofuturismo')
  })

  it('uses the site’s own picture when the content has none', () => {
    const m = contentMetadata({ ...base, image: null }) as any
    expect(m.openGraph.images[0].url).toBe(DEFAULT_SHARE_IMAGE)
    expect(m.twitter.images).toEqual([DEFAULT_SHARE_IMAGE])
  })

  it('is a plain page (no author or date) for videos and the rest', () => {
    const m = contentMetadata({ ...base, kind: 'website' }) as any
    expect(m.openGraph.type).toBe('website')
    expect(m.openGraph.authors).toBeUndefined()
    expect(m.openGraph.publishedTime).toBeUndefined()
  })

  it('leaves the summary out instead of sharing an empty one', () => {
    expect((contentMetadata({ ...base, description: '  ' }) as any).description).toBeUndefined()
  })
})

describe('addresses', () => {
  const saved = { ...process.env }
  afterEach(() => { process.env = { ...saved } })

  it('has no prefix in English and the language in the others', () => {
    expect(localizedPath('en', '/articles/x')).toBe('/articles/x')
    expect(localizedPath('pt', '/articles/x')).toBe('/pt/articles/x')
  })

  it('builds the site address from the configured one, without a trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://untold.example/'
    expect(siteUrl()).toBe('https://untold.example')
    delete process.env.NEXT_PUBLIC_SITE_URL
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'untold-six.vercel.app'
    expect(siteUrl()).toBe('https://untold-six.vercel.app')
  })
})
