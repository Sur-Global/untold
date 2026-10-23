import { describe, it, expect } from 'vitest'
import { cleanImportedTitle } from '@/lib/clean-title'

describe('cleanImportedTitle (imported titles have no quotation marks)', () => {
  it('removes straight, curly and angle double quotes', () => {
    expect(cleanImportedTitle('"Breve Historia del Futuro Latinoamericano" por Eduardo Marisca')).toBe('Breve Historia del Futuro Latinoamericano por Eduardo Marisca')
    expect(cleanImportedTitle('“Artistas IA”: entre el plagio y la dirección de arte')).toBe('Artistas IA: entre el plagio y la dirección de arte')
    expect(cleanImportedTitle('« Brève histoire de l\'avenir » par Eduardo')).toBe('Brève histoire de l\'avenir par Eduardo')
    expect(cleanImportedTitle('„Titel“ von Eduardo')).toBe('Titel von Eduardo')
  })
  it('keeps apostrophes and tidies the spaces it leaves', () => {
    expect(cleanImportedTitle("Don't  \"stop\"  now")).toBe("Don't stop now")
  })
  it('leaves a title without quotes untouched', () => {
    expect(cleanImportedTitle('Futuros posibles')).toBe('Futuros posibles')
  })
})
