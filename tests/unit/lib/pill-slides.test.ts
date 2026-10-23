import { describe, it, expect } from 'vitest'
import { blocksTextLength, firstSlideImage, localizedSlides, logoColorOf, MAX_SLIDES, newSlide, parseSlides, slideCredits, slidesProblem, SLIDE_TEXT_MAX, type PillSlide } from '@/lib/pill-slides'

const slide = (extra: Partial<PillSlide> = {}): PillSlide => ({ id: 's1', kind: 'photo', image_url: 'https://cdn/a.webp', text: 'Hola', credit: '', logo: 'auto', logo_color: null, ...extra })

describe('parseSlides', () => {
  it('reads slides from the JSON of a form and cleans them', () => {
    const json = JSON.stringify([
      { id: 'a', kind: 'photo', image_url: ' https://cdn/a.webp ', text: '  Crisis climática  ', credit: 'Autora, fuente', logo: 'black' },
      { id: 'b', kind: 'text', image_url: 'https://cdn/ignored.webp', text: 'Texto', logo: 'none' },
    ])
    const [photo, text] = parseSlides(json)
    expect(photo).toMatchObject({ id: 'a', kind: 'photo', image_url: 'https://cdn/a.webp', text: 'Crisis climática', credit: 'Autora, fuente', logo: 'black' })
    // a text slide has no picture and always the white logo
    expect(text).toMatchObject({ kind: 'text', image_url: null, logo: 'white' })
  })
  it('drops what is not a slide, keeps limits and links only https pictures', () => {
    expect(parseSlides('not json')).toEqual([])
    expect(parseSlides({})).toEqual([])
    expect(parseSlides([{ kind: 'video' }, null, 'x'])).toEqual([])
    expect(parseSlides([{ kind: 'photo', image_url: 'http://insecure/a.png' }])[0].image_url).toBeNull()
    expect(parseSlides([{ kind: 'text', text: 'x'.repeat(SLIDE_TEXT_MAX + 50) }])[0].text).toHaveLength(SLIDE_TEXT_MAX)
    expect(parseSlides(Array.from({ length: MAX_SLIDES + 5 }, () => ({ kind: 'text' })))).toHaveLength(MAX_SLIDES)
  })
  it('gives sensible defaults to the logo: automatic on photos, none on finished images', () => {
    expect(parseSlides([{ kind: 'photo' }])[0].logo).toBe('auto')
    expect(parseSlides([{ kind: 'image' }])[0].logo).toBe('none')
    expect(newSlide('text').logo).toBe('white')
  })
})

describe('slidesProblem', () => {
  it('asks for at least two slides, none of them empty', () => {
    expect(slidesProblem([slide()])).toMatch(/at least 2/)
    expect(slidesProblem([slide(), slide({ kind: 'text', image_url: null, text: '' })])).toMatch(/Slide 2 is empty: write its text/)
    expect(slidesProblem([slide(), slide({ image_url: null })])).toMatch(/Slide 2 is empty: add its picture/)
    expect(slidesProblem([slide(), slide({ kind: 'text', image_url: null, text: 'ok' })])).toBeNull()
  })
})

describe('logoColorOf', () => {
  it('is always white on lilac, follows the choice, and uses the automatic colour on photos', () => {
    expect(logoColorOf(slide({ kind: 'text', logo: 'black' }))).toBe('white')
    expect(logoColorOf(slide({ logo: 'black' }))).toBe('black')
    expect(logoColorOf(slide({ logo: 'none' }))).toBeNull()
    expect(logoColorOf(slide({ logo: 'auto', logo_color: 'black' }))).toBe('black')
    expect(logoColorOf(slide({ logo: 'auto', logo_color: null }))).toBe('white')
  })
})

describe('localizedSlides', () => {
  const slides = [slide({ id: 'a', text: 'Hola' }), slide({ id: 'b', kind: 'photo', text: '' })]
  it('uses the original texts in the original language', () => {
    expect(localizedSlides(slides, null, 'es', 'es')).toEqual({ slides, translated: true })
  })
  it('uses the translated text of each slide, and says when they are all there', () => {
    const r = localizedSlides(slides, { en: [{ id: 'a', text: 'Hello' }] }, 'en', 'es')
    expect(r.slides[0].text).toBe('Hello')
    expect(r.translated).toBe(true) // the second slide has no text to translate
  })
  it('keeps the original text and reports it when a language is not translated yet', () => {
    const r = localizedSlides(slides, {}, 'pt', 'es')
    expect(r.slides[0].text).toBe('Hola')
    expect(r.translated).toBe(false)
  })
})

describe('small helpers', () => {
  it('first picture, credits without repeats, and the length of a short text', () => {
    expect(firstSlideImage([slide({ kind: 'text', image_url: null }), slide({ image_url: 'https://cdn/b.webp' })])).toBe('https://cdn/b.webp')
    expect(slideCredits([slide({ credit: 'A' }), slide({ credit: '' }), slide({ credit: 'A' }), slide({ credit: 'B' })])).toEqual([{ number: 1, credit: 'A' }, { number: 4, credit: 'B' }])
    expect(blocksTextLength([{ type: 'paragraph', content: [{ type: 'text', text: 'Hola ' }, { type: 'text', text: 'mundo' }], children: [{ type: 'paragraph', content: [{ type: 'text', text: '!!' }] }] }])).toBe(12)
  })
})
