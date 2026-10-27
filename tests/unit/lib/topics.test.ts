import { describe, it, expect } from 'vitest'
import { TOPIC_STRIP_SIZE, cardTopic, pickTopicStrip, splitItemTags } from '@/lib/topics'
import type { CloudTag } from '@/lib/tag-cloud'

const cloud = (slug: string, count: number, isTopic = true, name = slug): CloudTag => ({ slug, name, count, isTopic })

describe('pickTopicStrip (the row of topics on a listing page)', () => {
  it('offers only topics, the ones with the most content first', () => {
    const tags = [cloud('ai', 9, false), cloud('arte', 2), cloud('futuros', 33), cloud('diseno', 27), cloud('economyhype', 1, false)]
    expect(pickTopicStrip(tags).map((t) => t.slug)).toEqual(['futuros', 'diseno', 'arte'])
  })

  it('offers at most 8 topics by default', () => {
    const tags = Array.from({ length: 12 }, (_, i) => cloud(`t${i}`, 100 - i))
    expect(TOPIC_STRIP_SIZE).toBe(8)
    expect(pickTopicStrip(tags)).toHaveLength(8)
    expect(pickTopicStrip(tags)[0].slug).toBe('t0')
  })

  it('breaks ties by name', () => {
    expect(pickTopicStrip([cloud('b', 3, true, 'Beta'), cloud('a', 3, true, 'Alfa')]).map((t) => t.slug)).toEqual(['a', 'b'])
  })

  it('keeps the tag being filtered in the row even when it is not a topic (so the filter can be seen and cleared)', () => {
    const tags = [cloud('futuros', 5), cloud('ai', 4, false)]
    expect(pickTopicStrip(tags, 'ai').map((t) => t.slug)).toEqual(['futuros', 'ai'])
    expect(pickTopicStrip(tags, 'nothing').map((t) => t.slug)).toEqual(['futuros'])
  })

  it('does not repeat a topic that is already in the row', () => {
    expect(pickTopicStrip([cloud('futuros', 5), cloud('arte', 2)], 'arte').map((t) => t.slug)).toEqual(['futuros', 'arte'])
  })

  it('is empty when there are no topics', () => {
    expect(pickTopicStrip([cloud('ai', 4, false)])).toEqual([])
  })
})

describe('splitItemTags (what a piece of content shows of its tags)', () => {
  const tag = (slug: string, name: string, is_topic = false) => ({ slug, names: { es: name }, is_topic })
  const counts = new Map([['futuros', 33], ['tecnologia', 15], ['inteligencia-artificial', 13], ['ai', 4]])

  it('the main topic is the most specific one (the one with the least content) and the next is suggested', () => {
    const tags = [tag('futuros', 'Futuros', true), tag('tecnologia', 'Tecnología', true), tag('inteligencia-artificial', 'Inteligencia artificial', true)]
    const result = splitItemTags(tags, counts, 'es')
    expect(result.primary).toEqual({ slug: 'inteligencia-artificial', name: 'Inteligencia artificial' })
    expect(result.related).toEqual({ slug: 'tecnologia', name: 'Tecnología' })
    expect(result.others).toEqual([{ slug: 'futuros', name: 'Futuros' }])
  })

  it('tags that are not topics are the plain tags at the end', () => {
    const result = splitItemTags([tag('ai', 'AI'), tag('futuros', 'Futuros', true), tag('economyhype', 'Economyhype')], counts, 'es')
    expect(result.primary?.slug).toBe('futuros')
    expect(result.related).toBeNull()
    expect(result.others.map((t) => t.slug)).toEqual(['ai', 'economyhype'])
  })

  it('has no main topic when the content has none', () => {
    const result = splitItemTags([tag('ai', 'AI')], counts, 'es')
    expect(result.primary).toBeNull()
    expect(result.related).toBeNull()
    expect(result.others).toEqual([{ slug: 'ai', name: 'AI' }])
  })

  it('names the topics in the reader’s language and ignores repeated or empty tags', () => {
    const tags = [{ slug: 'futuros', names: { es: 'Futuros', en: 'Futures' }, is_topic: true }, { slug: 'futuros', names: {}, is_topic: true }, { slug: '' } as any]
    expect(splitItemTags(tags, counts, 'en').primary).toEqual({ slug: 'futuros', name: 'Futures' })
  })

  it('a content with no tags shows nothing', () => {
    expect(splitItemTags([], counts, 'es')).toEqual({ primary: null, related: null, others: [] })
  })
})

describe('cardTopic (the category a card shows)', () => {
  it('is the first topic of the content; a tag that is not a topic is not shown as its category', () => {
    const rows = [{ tags: { slug: 'ai', is_topic: false } }, { tags: { slug: 'futuros', is_topic: true } }, { tags: { slug: 'arte', is_topic: true } }]
    expect(cardTopic(rows)?.slug).toBe('futuros')
    expect(cardTopic([{ tags: { slug: 'ai', is_topic: false } }])).toBeUndefined()
    expect(cardTopic([{ tags: null }])).toBeUndefined()
    expect(cardTopic(null)).toBeUndefined()
  })
})
