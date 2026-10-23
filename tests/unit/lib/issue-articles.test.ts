import { describe, it, expect } from 'vitest'
import { toIssueItems } from '@/lib/data/issue-articles'

const row = (over: Record<string, unknown> = {}) => ({
  id: 'a1', slug: 'la-mano', source_locale: 'es', single_language: false, published_at: '2020-09-04T10:00:00Z', read_time_minutes: 9,
  cover_image_url: 'https://cdn/x.webp',
  profiles: { display_name: 'Carlos Fuller Maúrtua', slug: 'carlos', avatar_url: null },
  content_translations: [{ locale: 'es', title: 'La mano que mueve la pluma' }, { locale: 'en', title: 'The hand that moves the pen' }],
  content_tags: [{ tags: { slug: 'literatura', names: { es: 'literatura', en: 'literature' } } }],
  ...over,
})

describe('toIssueItems', () => {
  it('shapes an issue’s articles for the list, in the reader’s language', () => {
    const [item] = toIssueItems([row()], 'en', (m) => `${m} min read`)
    expect(item).toMatchObject({ slug: 'la-mano', title: 'The hand that moves the pen', categoryTag: 'literature', authorName: 'Carlos Fuller Maúrtua', readTimeLabel: '9 min read', coverImageUrl: 'https://cdn/x.webp', isNew: false })
    expect(item.dateLabel).toMatch(/Sep/)
  })

  it('falls back gracefully when there is no tag, author, cover or read time', () => {
    const [item] = toIssueItems([row({ content_tags: [], profiles: null, cover_image_url: null, read_time_minutes: null })], 'es', (m) => `${m}`)
    expect(item).toMatchObject({ categoryTag: null, authorName: null, coverImageUrl: null, readTimeLabel: null, title: 'La mano que mueve la pluma' })
  })
})
