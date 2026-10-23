import { describe, it, expect } from 'vitest'
import { DEFAULT_PILL_ACCENT, normalizeAccent, PILL_ACCENTS } from '@/lib/pill-accent'

describe('pill accent colours', () => {
  it('are the seven colours of the SurGlobal brand manual', () => {
    expect(PILL_ACCENTS.map((a) => a.value)).toEqual(['#000000', '#F1F1F1', '#A1A1E9', '#D2FE73', '#FF470D', '#FFEB55', '#9A3130'])
  })
  it('keeps a brand colour, whatever its case, and turns anything else into lavender', () => {
    expect(normalizeAccent('#d2fe73')).toBe('#D2FE73')
    expect(normalizeAccent(' #FF470D ')).toBe('#FF470D')
    expect(normalizeAccent('#C45D3A')).toBe(DEFAULT_PILL_ACCENT)
    expect(normalizeAccent('')).toBe(DEFAULT_PILL_ACCENT)
    expect(normalizeAccent(null)).toBe(DEFAULT_PILL_ACCENT)
    expect(DEFAULT_PILL_ACCENT).toBe('#A1A1E9')
  })
})
