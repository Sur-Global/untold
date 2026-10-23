import { describe, it, expect } from 'vitest'
import { blocksTextLength, firstSlideImage, localizedSlides, logoColorOf, MAX_SLIDES, newSlide, parseSlides, slideCredits, slidesProblem, SLIDE_TEXT_MAX, type PillSlide, TEXT_DEFAULTS, textBand } from '@/lib/pill-slides'

const slide = (extra: Partial<PillSlide> = {}): PillSlide => ({ id: 's1', kind: 'photo', image_url: 'https://cdn/a.webp', text: 'Hola', credit: '', ...TEXT_DEFAULTS, brands: ['untold'], logo: 'auto', logo_color: null, ...extra })

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
  it('gives sensible defaults to the logos: none, with the automatic colour (white on lilac)', () => {
    const [photo, image, text] = parseSlides([{ kind: 'photo' }, { kind: 'image' }, { kind: 'text' }])
    expect([photo.brands, image.brands, text.brands]).toEqual([[], [], []])
    expect([photo.logo, image.logo, text.logo]).toEqual(['auto', 'auto', 'white'])
    expect(newSlide('photo').brands).toEqual([])
    expect(newSlide('photo', ['untold']).brands).toEqual(['untold'])
  })
  it('keeps the logos chosen (UNTOLD and / or SurGlobal, nothing else), and reads the old way of saving them', () => {
    expect(parseSlides([{ kind: 'photo', brands: ['surglobal', 'untold', 'other', 'untold'] }])[0].brands).toEqual(['untold', 'surglobal'])
    expect(parseSlides([{ kind: 'photo', logo: 'white' }])[0].brands).toEqual(['untold'])
    expect(parseSlides([{ kind: 'photo', logo: 'none' }])[0]).toMatchObject({ brands: [], logo: 'auto' })
  })
})

describe('text over a photo: place, size and colour', () => {
  it('starts bottom left, medium and white, as before it could be moved', () => {
    expect(newSlide('photo')).toMatchObject({ text_x: 'left', text_y: 'bottom', text_size: 'm', text_color: 'white' })
    expect(parseSlides([{ kind: 'photo' }])[0]).toMatchObject({ text_x: 'left', text_y: 'bottom', text_size: 'm', text_color: 'white' })
  })
  it('keeps the nine places, four sizes and two colours, and ignores anything else', () => {
    expect(parseSlides([{ kind: 'photo', text_x: 'right', text_y: 'top', text_size: 'xl', text_color: 'black' }])[0]).toMatchObject({ text_x: 'right', text_y: 'top', text_size: 'xl', text_color: 'black' })
    expect(parseSlides([{ kind: 'photo', text_x: 'diagonal', text_y: 'under', text_size: 'huge', text_color: 'red' }])[0]).toMatchObject({ text_x: 'left', text_y: 'bottom', text_size: 'm', text_color: 'white' })
  })
  it('has a soft band behind the text that is dark under white text and light under black text, only when there is text over a photo', () => {
    expect(textBand(slide({ text_y: 'top' }))).toEqual({ y: 'top', tone: 'dark' })
    expect(textBand(slide({ text_color: 'black', text_y: 'middle' }))).toEqual({ y: 'middle', tone: 'light' })
    expect(textBand(slide({ text: '' }))).toBeNull()
    expect(textBand(slide({ kind: 'text' }))).toBeNull()
    expect(textBand(slide({ kind: 'image' }))).toBeNull()
  })
})

describe('text slides: size, alignment and background', () => {
  it('start lilac, medium and left, as before they could be changed', () => {
    expect(newSlide('text')).toMatchObject({ text_bg: 'lilac', text_size: 'm', text_x: 'left' })
    expect(parseSlides([{ kind: 'text' }])[0]).toMatchObject({ text_bg: 'lilac', text_size: 'm', text_x: 'left' })
  })
  it('keep a white background, and ignore any other', () => {
    expect(parseSlides([{ kind: 'text', text_bg: 'white' }])[0].text_bg).toBe('white')
    expect(parseSlides([{ kind: 'text', text_bg: 'pink' }])[0].text_bg).toBe('lilac')
  })
  it('have a black logo on white and a white one on lilac', () => {
    expect(logoColorOf(slide({ kind: 'text', text_bg: 'white' }))).toBe('black')
    expect(logoColorOf(slide({ kind: 'text', text_bg: 'lilac' }))).toBe('white')
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
    expect(logoColorOf(slide({ brands: [] }))).toBeNull()
    expect(logoColorOf(slide({ kind: 'text', brands: [] }))).toBeNull()
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
