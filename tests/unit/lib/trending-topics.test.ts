import { describe, it, expect } from 'vitest'
import { NOT_TOPICS, rankTrendingTopics, recencyWeight, topicLabel } from '@/lib/trending-topics'

const NOW = new Date('2026-10-24T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString()
const row = (slug: string, days: number, likes = 0) => ({ tags: { slug, names: { es: slug, en: slug } }, content: { published_at: daysAgo(days), likes_count: likes } })

describe('recencyWeight', () => {
  it('counts recent content more than old content', () => {
    expect(recencyWeight(daysAgo(10), NOW)).toBe(1)
    expect(recencyWeight(daysAgo(120), NOW)).toBe(0.6)
    expect(recencyWeight(daysAgo(300), NOW)).toBe(0.3)
    expect(recencyWeight(daysAgo(900), NOW)).toBe(0.15)
    expect(recencyWeight(null, NOW)).toBe(0.15)
  })
})

describe('rankTrendingTopics', () => {
  it('puts first the topics with the most recent content', () => {
    const rows = [row('antiguo', 800), row('antiguo', 800), row('antiguo', 800), row('nuevo', 5), row('nuevo', 8)]
    expect(rankTrendingTopics(rows, NOW).map((t) => t.slug)).toEqual(['nuevo', 'antiguo'])
  })
  it('counts likes: a liked piece weighs more', () => {
    const rows = [row('a', 5), row('b', 5, 6)]
    expect(rankTrendingTopics(rows, NOW).map((t) => t.slug)).toEqual(['b', 'a'])
  })
  it('keeps only the asked number, and breaks ties by amount of content, then by name', () => {
    const rows = [row('c', 5), row('b', 5), row('a', 5), row('a', 5)]
    expect(rankTrendingTopics(rows, NOW, 2).map((t) => t.slug)).toEqual(['a', 'b'])
  })
  it('never offers the tags that name a kind of text instead of a subject', () => {
    const rows = [row('entrevista', 1), row('editorial', 1), row('futuros', 50)]
    expect(NOT_TOPICS.has('entrevista')).toBe(true)
    expect(rankTrendingTopics(rows, NOW).map((t) => t.slug)).toEqual(['futuros'])
  })
  it('ignores rows without a tag', () => {
    expect(rankTrendingTopics([{ tags: null }, {}], NOW)).toEqual([])
  })
})

describe('topicLabel', () => {
  it('uses the name in the reader’s language, capitalised, falling back to English and then the slug', () => {
    expect(topicLabel({ slug: 'decolonizacion', names: { es: 'decolonización', en: 'decolonization' } }, 'es')).toBe('Decolonización')
    expect(topicLabel({ slug: 'x', names: { en: 'decolonization' } }, 'fr')).toBe('Decolonization')
    expect(topicLabel({ slug: 'solo', names: {} }, 'fr')).toBe('Solo')
  })
})
