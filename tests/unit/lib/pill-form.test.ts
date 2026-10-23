import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/slide-logo', () => ({ resolveLogoColors: async (slides: any[]) => slides.map((s) => ({ ...s, logo_color: s.logo === 'auto' ? 'black' : s.logo_color })) }))

import { assertShortText, readPillFormat } from '@/lib/pill-form'
import { PILL_TEXT_MAX_CHARS } from '@/lib/pill-slides'

const form = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}
const photo = (id: string, extra = {}) => ({ id, kind: 'photo', image_url: `https://cdn/${id}.webp`, text: 'Hola', logo: 'auto', ...extra })

describe('readPillFormat', () => {
  it('a text pill has no slides and no description', async () => {
    expect(await readPillFormat(form({}), true)).toEqual({ format: 'text', slides: [], description: null })
  })
  it('a carousel keeps its cleaned slides, with the logo colour chosen, and its description', async () => {
    const r = await readPillFormat(form({ format: 'carousel', slides: JSON.stringify([photo('a'), photo('b')]), description: '  Una descripción  ' }), false)
    expect(r.format).toBe('carousel')
    expect(r.slides).toHaveLength(2)
    expect(r.slides[0]).toMatchObject({ id: 'a', logo: 'auto', logo_color: 'black' })
    expect(r.description).toBe('Una descripción')
  })
  it('a draft carousel can be incomplete, but publishing needs at least two complete slides', async () => {
    const one = form({ format: 'carousel', slides: JSON.stringify([photo('a')]) })
    await expect(readPillFormat(one, false)).resolves.toBeTruthy()
    await expect(readPillFormat(one, true)).rejects.toThrow(/at least 2/)
    const empty = form({ format: 'carousel', slides: JSON.stringify([photo('a'), photo('b', { image_url: null })]) })
    await expect(readPillFormat(empty, true)).rejects.toThrow(/Slide 2 is empty/)
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
