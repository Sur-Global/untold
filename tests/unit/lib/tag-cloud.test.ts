import { describe, it, expect } from 'vitest'
import { buildTagCloud, cloudFontSize } from '@/lib/tag-cloud'
import { loadTagCloud, contentIdsForTag } from '@/lib/data/tag-cloud'

const tag = (slug: string, es: string, en?: string) => ({ tags: { slug, names: { es, ...(en ? { en } : {}) } } })

describe('buildTagCloud', () => {
  it('counts each topic, named in the reader’s language, and lists them alphabetically', () => {
    const rows = [tag('futuros', 'futuros', 'futures'), tag('diseno', 'diseño', 'design'), tag('futuros', 'futuros', 'futures'), tag('futuros', 'futuros', 'futures'), tag('ciudades', 'ciudades', 'cities')]
    expect(buildTagCloud(rows, 'es')).toEqual([
      { slug: 'ciudades', name: 'ciudades', count: 1 },
      { slug: 'diseno', name: 'diseño', count: 1 },
      { slug: 'futuros', name: 'futuros', count: 3 },
    ])
    expect(buildTagCloud(rows, 'en').map((t) => t.name)).toEqual(['cities', 'design', 'futures'])
  })
  it('falls back to English, then to the slug, when a language has no name', () => {
    expect(buildTagCloud([tag('a', 'a', 'Alpha')], 'fr')[0].name).toBe('Alpha')
    expect(buildTagCloud([{ tags: { slug: 'solo', names: {} } }], 'fr')[0].name).toBe('solo')
  })
  it('keeps only the most used topics when there are too many', () => {
    const rows = [...Array.from({ length: 5 }, () => tag('a', 'a')), ...Array.from({ length: 3 }, () => tag('b', 'b')), tag('c', 'c')]
    expect(buildTagCloud(rows, 'es', 2).map((t) => t.slug)).toEqual(['a', 'b'])
  })
  it('ignores rows without a tag', () => {
    expect(buildTagCloud([{ tags: null }, {}], 'es')).toEqual([])
  })
})

describe('cloudFontSize', () => {
  it('goes from small (least content) to big (most content)', () => {
    expect(cloudFontSize(1, 1, 10)).toBe(13)
    expect(cloudFontSize(10, 1, 10)).toBe(26)
    expect(cloudFontSize(5, 1, 10)).toBeGreaterThan(13)
    expect(cloudFontSize(5, 1, 10)).toBeLessThan(26)
  })
  it('uses one size when every topic has the same amount', () => {
    expect(cloudFontSize(2, 2, 2)).toBe(16)
  })
})

function fakeDb(byTable: Record<string, any>) {
  return {
    from(table: string) {
      const result = byTable[table]
      const chain: any = new Proxy({}, { get: (_t, prop) => (prop === 'then' ? (res: any) => res(result) : prop === 'maybeSingle' ? () => Promise.resolve(result) : () => chain) })
      return chain
    },
  } as any
}

describe('loadTagCloud', () => {
  it('builds the cloud from the topics of the published content of that kind', async () => {
    const db = fakeDb({ content_tags: { data: [tag('ciudades', 'ciudades'), tag('ciudades', 'ciudades'), tag('diseno', 'diseño')] } })
    expect(await loadTagCloud(db, 'video', 'es')).toEqual([
      { slug: 'ciudades', name: 'ciudades', count: 2 },
      { slug: 'diseno', name: 'diseño', count: 1 },
    ])
  })
})

describe('contentIdsForTag', () => {
  it('gives the content that has the topic', async () => {
    const db = fakeDb({ tags: { data: { id: 't1' } }, content_tags: { data: [{ content_id: 'c1' }, { content_id: 'c2' }] } })
    expect(await contentIdsForTag(db, 'ciudades')).toEqual(['c1', 'c2'])
  })
  it('matches nothing for a topic that does not exist or has no content', async () => {
    expect((await contentIdsForTag(fakeDb({ tags: { data: null } }), 'x'))[0]).toMatch(/^0{8}-/)
    expect((await contentIdsForTag(fakeDb({ tags: { data: { id: 't1' } }, content_tags: { data: [] } }), 'x'))[0]).toMatch(/^0{8}-/)
  })
})
