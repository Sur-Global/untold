import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { cornerBrightness, logoColorForBrightness, resolveLogoColors } from '@/lib/slide-logo'
import { TEXT_DEFAULTS, textBand, type PillSlide } from '@/lib/pill-slides'

const solid = (color: string) => sharp({ create: { width: 200, height: 250, channels: 3, background: color } }).png().toBuffer()

describe('logoColorForBrightness', () => {
  it('white on dark pictures, black on light ones', () => {
    expect(logoColorForBrightness(0.1)).toBe('white')
    expect(logoColorForBrightness(0.9)).toBe('black')
  })
  it('counts the dark band under white text at the bottom, which darkens the corner', () => {
    expect(logoColorForBrightness(0.7, null)).toBe('black')
    expect(logoColorForBrightness(0.7, 'dark')).toBe('white')
  })
  it('counts the light band under black text at the bottom, which lightens the corner', () => {
    expect(logoColorForBrightness(0.3, null)).toBe('white')
    expect(logoColorForBrightness(0.3, 'light')).toBe('black')
  })
})

describe('cornerBrightness', () => {
  it('measures the bottom right corner, where the logo goes', async () => {
    expect(await cornerBrightness(await solid('#000000'))).toBeLessThan(0.05)
    expect(await cornerBrightness(await solid('#ffffff'))).toBeGreaterThan(0.95)
  })
})

describe('resolveLogoColors and the place of the text', () => {
  const photo = (extra: Partial<PillSlide>): PillSlide => ({ id: 'p', kind: 'photo', image_url: null, text: 'Hola', credit: '', ...TEXT_DEFAULTS, brands: ['untold'], logo: 'auto', logo_color: null, ...extra })
  it('the band under the text follows the text: dark under white, light under black, none without text', () => {
    // the picture cannot be fetched in a test, so this checks the rule that decides which band reaches the corner
    expect(textBand(photo({ text_y: 'bottom' }))).toEqual({ y: 'bottom', tone: 'dark' })
    expect(textBand(photo({ text_y: 'top', text_color: 'black' }))).toEqual({ y: 'top', tone: 'light' })
    expect(textBand(photo({ text: '' }))).toBeNull()
    expect(textBand(photo({ kind: 'text' }))).toBeNull()
  })
})

describe('resolveLogoColors', () => {
  const base: PillSlide = { id: 'a', kind: 'photo', image_url: null, text: '', credit: '', ...TEXT_DEFAULTS, brands: ['untold'], logo: 'auto', logo_color: null }
  it('leaves text slides and chosen colours as they are, and uses white when the picture cannot be read', async () => {
    const out = await resolveLogoColors([
      { ...base, kind: 'text', logo: 'white' },
      { ...base, logo: 'black' },
      { ...base, image_url: 'http://not-https.example/a.png' },
      { ...base, brands: [], logo_color: 'black' },
    ])
    expect(out[0].logo_color).toBeNull()
    expect(out[1].logo_color).toBeNull()
    expect(out[2].logo_color).toBe('white')
    // no logo, no colour
    expect(out[3].logo_color).toBeNull()
  })
})
