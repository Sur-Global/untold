import { describe, it, expect } from 'vitest'
import { rankRelated, type RelatedCandidate } from '@/lib/related'

const item = (id: string, tags: string[], extra: Partial<RelatedCandidate> = {}): RelatedCandidate => ({
  id, type: 'article', tagSlugs: tags, isFeatured: false, publishedAt: '2026-01-01T00:00:00Z', ...extra,
})
const current = { id: 'me', type: 'article', tagSlugs: ['futuros', 'diseno'] }
const ids = (list: RelatedCandidate[]) => list.map((i) => i.id)

describe('rankRelated ("También te puede interesar")', () => {
  it('puts featured content on the same topic first, then the most recent on that topic', () => {
    const list = [
      item('old', ['futuros'], { publishedAt: '2025-01-01T00:00:00Z' }),
      item('new', ['futuros'], { publishedAt: '2026-06-01T00:00:00Z' }),
      item('star', ['diseno'], { isFeatured: true, publishedAt: '2024-01-01T00:00:00Z' }),
    ]
    expect(ids(rankRelated(current, list))).toEqual(['star', 'new', 'old'])
  })

  it('without featured content, takes the most recent on the same topic (and more topics in common first)', () => {
    const list = [
      item('a', ['futuros'], { publishedAt: '2026-05-01T00:00:00Z' }),
      item('b', ['futuros', 'diseno'], { publishedAt: '2026-01-01T00:00:00Z' }),
      item('c', ['futuros'], { publishedAt: '2026-07-01T00:00:00Z' }),
    ]
    expect(ids(rankRelated(current, list))).toEqual(['b', 'c', 'a'])
  })

  it('never suggests the content itself', () => {
    expect(ids(rankRelated(current, [item('me', ['futuros']), item('x', ['futuros'])]))).toEqual(['x'])
  })

  it('tops up with the closest content when few share a topic: featured first, then the same kind, then the newest', () => {
    const list = [
      item('same-topic', ['futuros']),
      item('video-new', ['otro'], { type: 'video', publishedAt: '2026-09-01T00:00:00Z' }),
      item('article-old', ['otro'], { publishedAt: '2025-01-01T00:00:00Z' }),
      item('pill-star', ['otro'], { type: 'pill', isFeatured: true }),
    ]
    expect(ids(rankRelated(current, list))).toEqual(['same-topic', 'pill-star', 'article-old'])
  })

  it('a content with no topics gets featured items first, then the newest of the same kind', () => {
    const noTags = { id: 'me', type: 'video', tagSlugs: [] }
    const list = [
      item('article', [], { publishedAt: '2026-09-01T00:00:00Z' }),
      item('video', [], { type: 'video', publishedAt: '2026-02-01T00:00:00Z' }),
      item('star', [], { isFeatured: true, publishedAt: '2024-01-01T00:00:00Z' }),
      item('video-old', [], { type: 'video', publishedAt: '2025-01-01T00:00:00Z' }),
    ]
    expect(ids(rankRelated(noTags, list))).toEqual(['star', 'video', 'video-old'])
  })

  it('returns fewer than three when there is not enough content', () => {
    expect(rankRelated(current, [item('only', ['futuros'])])).toHaveLength(1)
    expect(rankRelated(current, [])).toEqual([])
  })
})
