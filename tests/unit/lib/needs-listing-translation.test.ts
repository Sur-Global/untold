import { describe, it, expect } from 'vitest'
import { needsListingTranslation } from '@/lib/content'

const rows = (...locales: string[]) => locales.map((locale) => ({ locale }))

describe('needsListingTranslation', () => {
  it('is true for content that has no row in the visitor’s language, false when it has one', () => {
    expect(needsListingTranslation({ type: 'article', content_translations: rows('es') }, 'en')).toBe(true)
    expect(needsListingTranslation({ type: 'article', content_translations: rows('es', 'en') }, 'en')).toBe(false)
    expect(needsListingTranslation({ type: 'article', content_translations: rows('es') }, 'es')).toBe(false)
  })
  it('is false for an article, a pill or a course marked "only in this language": its text is never translated', () => {
    expect(needsListingTranslation({ type: 'article', single_language: true, content_translations: rows('es') }, 'en')).toBe(false)
    expect(needsListingTranslation({ type: 'pill', single_language: true, content_translations: rows('es') }, 'en')).toBe(false)
    expect(needsListingTranslation({ type: 'course', single_language: true, content_translations: rows('es') }, 'en')).toBe(false)
  })
  it('is still true for a course that is not marked "only in this language"', () => {
    expect(needsListingTranslation({ type: 'course', single_language: false, content_translations: rows('es') }, 'en')).toBe(true)
  })
  it('is true for a video or podcast "only in this language": its card still has to read in the visitor’s language', () => {
    for (const type of ['video', 'podcast']) {
      expect(needsListingTranslation({ type, single_language: true, content_translations: rows('es') }, 'en')).toBe(true)
      expect(needsListingTranslation({ type, single_language: true, content_translations: rows('es', 'en') }, 'en')).toBe(false)
    }
  })
  it('copes with an item that has no translations or no type', () => {
    expect(needsListingTranslation({ content_translations: null }, 'en')).toBe(true)
    expect(needsListingTranslation({ single_language: true, content_translations: rows('es') }, 'en')).toBe(false)
  })
})
