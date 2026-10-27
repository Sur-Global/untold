import { describe, it, expect } from 'vitest'
import { loadAllTopics, loadContentTopics, loadTagCounts, mostRelatedTopic, relatedTopics } from '@/lib/data/topics'

/** A database that answers each table's queries in turn */
function fakeDb(answers: Record<string, any[]>) {
  const queue = Object.fromEntries(Object.entries(answers).map(([table, list]) => [table, [...list]]))
  return {
    from(table: string) {
      const result = queue[table]?.shift() ?? { data: [] }
      const chain: any = new Proxy({}, { get: (_t, prop) => (prop === 'then' ? (res: any) => res(result) : prop === 'maybeSingle' ? () => Promise.resolve(result) : () => chain) })
      return chain
    },
  } as any
}

const row = (slug: string, es: string, is_topic = true) => ({ tags: { slug, names: { es }, is_topic } })

describe('loadTagCounts', () => {
  it('counts the published content of each tag', async () => {
    const db = fakeDb({ content_tags: [{ data: [{ tags: { slug: 'a' } }, { tags: { slug: 'a' } }, { tags: { slug: 'b' } }, { tags: null }] }] })
    expect([...(await loadTagCounts(db))]).toEqual([['a', 2], ['b', 1]])
  })
})

describe('relatedTopics', () => {
  it('lists the topics that most often go with a topic, the closest first, at most the asked number', async () => {
    const db = fakeDb({
      tags: [{ data: { id: 't1' } }],
      content_tags: [
        { data: [{ content_id: 'c1' }, { content_id: 'c2' }, { content_id: 'c3' }] },
        { data: [row('futuros', 'Futuros'), row('tecnologia', 'Tecnología'), row('tecnologia', 'Tecnología'), row('diseno', 'Diseño'), row('diseno', 'Diseño'), row('arte', 'Arte'), row('tecnologia', 'Tecnología')] },
      ],
    })
    expect(await relatedTopics(db, 'futuros', 'es', 2)).toEqual([{ slug: 'tecnologia', name: 'Tecnología' }, { slug: 'diseno', name: 'Diseño' }])
  })

  it('is empty for a topic that does not exist or has no content', async () => {
    expect(await relatedTopics(fakeDb({ tags: [{ data: null }] }), 'x', 'es')).toEqual([])
    expect(await relatedTopics(fakeDb({ tags: [{ data: { id: 't' } }], content_tags: [{ data: [] }] }), 'x', 'es')).toEqual([])
  })
})

describe('mostRelatedTopic', () => {
  it('is the topic that most often goes with the given one, never the given one itself', async () => {
    const db = fakeDb({
      tags: [{ data: { id: 't1' } }],
      content_tags: [
        { data: [{ content_id: 'c1' }, { content_id: 'c2' }, { content_id: 'c3' }] },
        { data: [row('futuros', 'Futuros'), row('tecnologia', 'Tecnología'), row('tecnologia', 'Tecnología'), row('diseno', 'Diseño'), row('tecnologia', 'Tecnología')] },
      ],
    })
    expect(await mostRelatedTopic(db, 'futuros', 'es')).toEqual({ slug: 'tecnologia', name: 'Tecnología' })
  })

  it('skips the topics it is told to', async () => {
    const db = fakeDb({
      tags: [{ data: { id: 't1' } }],
      content_tags: [{ data: [{ content_id: 'c1' }] }, { data: [row('tecnologia', 'Tecnología'), row('tecnologia', 'Tecnología'), row('diseno', 'Diseño')] }],
    })
    expect(await mostRelatedTopic(db, 'futuros', 'es', ['tecnologia'])).toEqual({ slug: 'diseno', name: 'Diseño' })
  })

  it('is nothing for a topic that does not exist, has no content or never goes with another', async () => {
    expect(await mostRelatedTopic(fakeDb({ tags: [{ data: null }] }), 'x', 'es')).toBeNull()
    expect(await mostRelatedTopic(fakeDb({ tags: [{ data: { id: 't' } }], content_tags: [{ data: [] }] }), 'x', 'es')).toBeNull()
    expect(await mostRelatedTopic(fakeDb({ tags: [{ data: { id: 't' } }], content_tags: [{ data: [{ content_id: 'c' }] }, { data: [row('x', 'X')] }] }), 'x', 'es')).toBeNull()
  })
})

describe('loadContentTopics', () => {
  const tag = (slug: string, es: string, is_topic = true) => ({ slug, names: { es }, is_topic })

  it('gives the main topic, the one to explore also and the other tags', async () => {
    const db = fakeDb({ content_tags: [{ data: [{ tags: { slug: 'futuros' } }, { tags: { slug: 'futuros' } }, { tags: { slug: 'ia' } }] }] })
    const result = await loadContentTopics(db, [tag('futuros', 'Futuros'), tag('ia', 'IA'), tag('ai', 'AI', false)], 'es')
    expect(result.primary?.slug).toBe('ia')
    expect(result.related?.slug).toBe('futuros')
    expect(result.others.map((t) => t.slug)).toEqual(['ai'])
  })

  it('with a single topic, suggests the topic that most often goes with it', async () => {
    const db = fakeDb({
      content_tags: [{ data: [{ tags: { slug: 'ia' } }] }, { data: [{ content_id: 'c1' }, { content_id: 'c2' }] }, { data: [row('tecnologia', 'Tecnología'), row('tecnologia', 'Tecnología'), row('ia', 'IA')] }],
      tags: [{ data: { id: 't' } }],
    })
    const result = await loadContentTopics(db, [tag('ia', 'IA')], 'es')
    expect(result.primary?.slug).toBe('ia')
    expect(result.related).toEqual({ slug: 'tecnologia', name: 'Tecnología' })
  })

  it('does not look for a suggestion when there is no topic', async () => {
    const db = fakeDb({ content_tags: [{ data: [] }] })
    expect(await loadContentTopics(db, [tag('ai', 'AI', false)], 'es')).toEqual({ primary: null, related: null, others: [{ slug: 'ai', name: 'AI' }] })
  })
})

describe('loadAllTopics', () => {
  it('lists each topic with its published content, A to Z', async () => {
    const db = fakeDb({ content_tags: [{ data: [row('futuros', 'Futuros'), row('arte', 'Arte'), row('futuros', 'Futuros')] }] })
    expect(await loadAllTopics(db, 'es')).toEqual([{ slug: 'arte', name: 'Arte', count: 1 }, { slug: 'futuros', name: 'Futuros', count: 2 }])
  })
})
