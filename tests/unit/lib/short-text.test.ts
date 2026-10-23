import { describe, it, expect } from 'vitest'
import { shortText } from '@/lib/short-text'

describe('shortText', () => {
  it('leaves a short text as it is, with the spaces tidied', () => {
    expect(shortText('Hola   mundo\n', 50)).toBe('Hola mundo')
  })
  it('cuts at the end of a sentence when there is one in the second half', () => {
    const text = 'Una frase completa y larga aquí. Otra frase que ya no cabe del todo en el límite.'
    expect(shortText(text, 50)).toBe('Una frase completa y larga aquí.')
  })
  it('otherwise cuts at a word and adds an ellipsis', () => {
    const text = 'palabra '.repeat(30)
    const cut = shortText(text, 50)
    expect(cut.endsWith('…')).toBe(true)
    expect(cut.length).toBeLessThanOrEqual(51)
    expect(cut).not.toMatch(/palabr…$/)
  })
})
