import { describe, it, expect } from 'vitest'
import { loadRelatedContent } from '@/lib/data/related-content'

/** A fake database: `from(table)` answers with the next prepared result for that table, whatever the filters */
function fakeDb(results: Record<string, any[][]>) {
  const queues: Record<string, any[][]> = Object.fromEntries(Object.entries(results).map(([k, v]) => [k, [...v]]))
  return {
    from(table: string) {
      const data = queues[table]?.shift() ?? []
      const chain: any = new Proxy({}, {
        get: (_t, prop) => (prop === 'then' ? (res: any) => res({ data }) : () => chain),
      })
      return chain
    },
  } as any
}

const tags = (...slugs: string[]) => slugs.map((slug) => ({ tags: { slug, names: { es: slug.toUpperCase(), en: slug } } }))
const row = (id: string, extra: Record<string, any> = {}) => ({
  id, slug: `slug-${id}`, type: 'article', source_locale: 'es', single_language: false, subtitle_locales: null,
  is_featured: false, is_home_featured: false, is_hero_featured: false, likes_count: 2, published_at: '2026-01-01T00:00:00Z',
  cover_image_url: `https://cdn/${id}.webp`, read_time_minutes: 5,
  profiles: { display_name: 'Ana', slug: 'ana', avatar_url: null },
  content_translations: [{ locale: 'es', title: `Título ${id}`, excerpt: `Resumen ${id}` }],
  content_tags: tags('futuros'), video_meta: null, podcast_meta: null, pill_meta: null, ...extra,
})

const own = [{ tag_id: 't1', tags: { slug: 'futuros' } }]

describe('loadRelatedContent', () => {
  it('suggests three: featured on the same topic, then the rest of the topic, then the closest featured content', async () => {
    const db = fakeDb({
      content_tags: [own],
      content: [
        [row('a', { published_at: '2026-03-01T00:00:00Z' }), row('b', { is_featured: true, published_at: '2025-01-01T00:00:00Z' })],
        [row('b', { is_featured: true }), row('z', { content_tags: tags('otro'), is_featured: true })],
        [row('a'), row('d', { content_tags: tags('otro') })],
      ],
    })
    const items = await loadRelatedContent(db, { contentId: 'me', type: 'article', locale: 'es' })
    expect(items.map((i) => i.contentId)).toEqual(['b', 'a', 'z'])
    expect(items[0]).toMatchObject({ title: 'Título b', slug: 'slug-b', type: 'article', isFeatured: true, authorSlug: 'ana', categoryTag: 'FUTUROS' })
  })

  it('works for a page with no topics: featured, then the most recent', async () => {
    const db = fakeDb({
      content_tags: [[]],
      content: [
        [row('star', { is_hero_featured: true, content_tags: [] })],
        [row('new', { published_at: '2026-09-01T00:00:00Z' }), row('old', { published_at: '2025-01-01T00:00:00Z' })],
      ],
    })
    const items = await loadRelatedContent(db, { contentId: 'me', type: 'article', locale: 'es' })
    expect(items.map((i) => i.contentId)).toEqual(['star', 'new', 'old'])
  })

  it('maps videos, podcasts and pills with their own details, and marks what the reader bookmarked', async () => {
    const db = fakeDb({
      content_tags: [own],
      content: [
        [
          row('v', { type: 'video', cover_image_url: null, video_meta: { thumbnail_url: 'https://cdn/v.jpg', duration: '12:30' } }),
          row('p', { type: 'podcast', podcast_meta: { duration: '40:00', episode_number: '7' } }),
          row('k', { type: 'pill', cover_image_url: null, pill_meta: { accent_color: '#6B8E23', image_url: 'https://cdn/k.png' } }),
        ],
        [],
        [],
      ],
      bookmarks: [[{ content_id: 'p' }]],
    })
    const items = await loadRelatedContent(db, { contentId: 'me', type: 'article', locale: 'es', userId: 'u1' })
    const by = Object.fromEntries(items.map((i) => [i.contentId, i]))
    expect(by.v).toMatchObject({ coverImageUrl: 'https://cdn/v.jpg', duration: '12:30' })
    expect(by.p).toMatchObject({ episodeNumber: '7', duration: '40:00', isBookmarked: true })
    expect(by.k).toMatchObject({ accentColor: '#6B8E23', coverImageUrl: 'https://cdn/k.png', isBookmarked: false })
  })

  it('returns nothing when there is nothing else published', async () => {
    const db = fakeDb({ content_tags: [own], content: [[], [], []] })
    expect(await loadRelatedContent(db, { contentId: 'me', type: 'article', locale: 'es' })).toEqual([])
  })
})
