import { describe, it, expect } from 'vitest'
import { tagDisplayName, tagSlugFor } from '@/lib/tag-name'
import { slugify } from '@/lib/utils'

describe('tagDisplayName', () => {
  it('shows the tag in the language of the person', () => {
    const names = { en: 'Decoloniality', es: 'Decolonialidad', pt: 'Decolonialidade' }
    expect(tagDisplayName(names, 'es', 'decolonialidad')).toBe('Decolonialidad')
    expect(tagDisplayName(names, 'pt', 'decolonialidad')).toBe('Decolonialidade')
    expect(tagDisplayName(names, 'en', 'decolonialidad')).toBe('Decoloniality')
  })
  it('falls back to English, then to any language the tag has, then to its slug', () => {
    expect(tagDisplayName({ en: 'Memory' }, 'fr', 'memory')).toBe('Memory')
    expect(tagDisplayName({ es: 'Memoria' }, 'fr', 'memoria')).toBe('Memoria')
    expect(tagDisplayName({}, 'fr', 'memoria')).toBe('memoria')
    expect(tagDisplayName(null, 'es', 'memoria')).toBe('memoria')
  })
})

describe('tagSlugFor', () => {
  it('turns accents into plain letters instead of dropping them', () => {
    expect(tagSlugFor('Decolonización', slugify)).toBe('decolonizacion')
    expect(tagSlugFor('  Educação popular ', slugify)).toBe('educacao-popular')
  })
})
