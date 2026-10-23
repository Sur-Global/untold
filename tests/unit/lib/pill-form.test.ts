import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/slide-logo', () => ({ resolveLogoColors: async (slides: any[]) => slides.map((s) => ({ ...s, logo_color: s.logo === 'auto' ? 'black' : s.logo_color })) }))

import { assertShortText, readPillFormat } from '@/lib/pill-form'
import { PILL_TEXT_MAX_CHARS } from '@/lib/pill-slides'

const form = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}
const editor = { canBrand: true }
const creator = { canBrand: false }
const photo = (id: string, extra = {}) => ({ id, kind: 'photo', image_url: `https://cdn/${id}.webp`, text: 'Hola', brands: ['untold'], logo: 'auto', ...extra })

describe('readPillFormat', () => {
  it('a text pill has no slides and no description', async () => {
    expect(await readPillFormat(form({}), true, editor)).toEqual({ format: 'text', slides: [], description: null })
  })
  it('a carousel keeps its cleaned slides, with the logo colour chosen, and its description', async () => {
    const r = await readPillFormat(form({ format: 'carousel', slides: JSON.stringify([photo('a'), photo('b')]), description: '  Una descripción  ' }), false, editor)
    expect(r.format).toBe('carousel')
    expect(r.slides).toHaveLength(2)
    expect(r.slides[0]).toMatchObject({ id: 'a', logo: 'auto', logo_color: 'black' })
    expect(r.description).toBe('Una descripción')
  })
  it('a draft carousel can be incomplete, but publishing needs at least two complete slides', async () => {
    const one = form({ format: 'carousel', slides: JSON.stringify([photo('a')]) })
    await expect(readPillFormat(one, false, editor)).resolves.toBeTruthy()
    await expect(readPillFormat(one, true, editor)).rejects.toThrow(/at least 2/)
    const empty = form({ format: 'carousel', slides: JSON.stringify([photo('a'), photo('b', { image_url: null })]) })
    await expect(readPillFormat(empty, true, editor)).rejects.toThrow(/Slide 2 is empty/)
  })
})

describe('who chooses the logos', () => {
  const sent = (brands: string[]) => form({ format: 'carousel', slides: JSON.stringify([photo('a', { brands }), photo('b', { brands })]) })
  it('an admin or editor chooses them', async () => {
    const r = await readPillFormat(sent(['surglobal']), false, editor)
    expect(r.slides.map((s) => s.brands)).toEqual([['surglobal'], ['surglobal']])
  })
  it('a creator cannot add any, whatever the form says', async () => {
    const r = await readPillFormat(sent(['untold', 'surglobal']), false, creator)
    expect(r.slides.map((s) => s.brands)).toEqual([[], []])
  })
  it('a creator editing keeps the logos an editor put on the slides that already existed', async () => {
    const existing = [photo('a', { brands: ['surglobal'], logo: 'black' })]
    const r = await readPillFormat(sent(['untold']), false, { canBrand: false, existing })
    expect(r.slides[0]).toMatchObject({ id: 'a', brands: ['surglobal'], logo: 'black' })
    expect(r.slides[1]).toMatchObject({ id: 'b', brands: [] })
  })
})

describe('assertShortText', () => {
  const body = (n: number) => [{ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(n) }] }]
  it('lets a very short text through and refuses a long one', () => {
    expect(() => assertShortText(body(PILL_TEXT_MAX_CHARS))).not.toThrow()
    expect(() => assertShortText(body(PILL_TEXT_MAX_CHARS + 1))).toThrow(/very short/)
    expect(() => assertShortText(null)).not.toThrow()
  })
})
