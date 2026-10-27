import { describe, it, expect } from 'vitest'
import { buildHeroItems } from '@/lib/featured-hero'

const readTime = (m: number) => `${m} min de lectura`
const base = {
  slug: 'reescribiendo-el-futuro',
  cover_image_url: 'https://cdn/c.webp',
  read_time_minutes: 23,
  profiles: { display_name: 'Elsie Ralston' },
  content_translations: [{ locale: 'es', title: 'Reescribiendo el futuro', excerpt: null }],
  content_tags: [{ tags: { slug: 'ai', names: { es: 'AI' }, is_topic: false } }, { tags: { slug: 'futuros', names: { es: 'futuros', en: 'futures' }, is_topic: true } }],
}

describe('buildHeroItems', () => {
  it('describes an article: its address, title, picture, first topic (not a plain tag), author and reading time', () => {
    expect(buildHeroItems([base], 'article', 'es', readTime)).toEqual([
      { href: '/articles/reescribiendo-el-futuro', title: 'Reescribiendo el futuro', imageUrl: 'https://cdn/c.webp', topic: { name: 'futuros', slug: 'futuros' }, authorName: 'Elsie Ralston', meta: '23 min de lectura' },
    ])
  })

  it('names the topic in the reader’s language', () => {
    expect(buildHeroItems([base], 'article', 'en', readTime)[0].topic).toEqual({ name: 'futures', slug: 'futuros' })
  })

  it('describes a video: the length instead of the reading time, and the thumbnail when it has no cover', () => {
    const video = { ...base, slug: 'v', cover_image_url: null, read_time_minutes: null, video_meta: { duration: '33:00', thumbnail_url: 'https://cdn/t.jpg' } }
    expect(buildHeroItems([video], 'video', 'es', readTime)[0]).toMatchObject({ href: '/videos/v', imageUrl: 'https://cdn/t.jpg', meta: '33:00' })
    expect(buildHeroItems([{ ...video, video_meta: [{ duration: '1:03', thumbnail_url: null }] }], 'video', 'es', readTime)[0]).toMatchObject({ imageUrl: null, meta: '1:03' })
  })

  it('copes with what is missing', () => {
    const [bare] = buildHeroItems([{ slug: 's' }], 'article', 'es', readTime)
    expect(bare).toEqual({ href: '/articles/s', title: 'Untitled', imageUrl: null, topic: null, authorName: null, meta: null })
  })
})
