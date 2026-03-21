import { describe, it, expect } from 'vitest'
import { getTranslation } from '@/lib/content'

const translations = [
  { locale: 'en', title: 'Hello', excerpt: 'World', description: null, body: null },
  { locale: 'es', title: 'Hola', excerpt: 'Mundo', description: null, body: null },
]

describe('getTranslation', () => {
  it('returns the requested locale if available', () => {
    expect(getTranslation(translations, 'es')?.title).toBe('Hola')
  })
  it('falls back to en if requested locale not found', () => {
    expect(getTranslation(translations, 'fr')?.title).toBe('Hello')
  })
  it('returns first available if en also missing', () => {
    const onlyEs = [{ locale: 'es', title: 'Hola', excerpt: null, description: null, body: null }]
    expect(getTranslation(onlyEs, 'fr')?.title).toBe('Hola')
  })
  it('returns null for empty array', () => {
    expect(getTranslation([], 'en')).toBeNull()
  })
})
