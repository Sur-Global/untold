import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { cornerBrightness, logoColorForBrightness, resolveLogoColors } from '@/lib/slide-logo'
import type { PillSlide } from '@/lib/pill-slides'

const solid = (color: string) => sharp({ create: { width: 200, height: 250, channels: 3, background: color } }).png().toBuffer()

describe('logoColorForBrightness', () => {
  it('white on dark pictures, black on light ones', () => {
    expect(logoColorForBrightness(0.1, false)).toBe('white')
    expect(logoColorForBrightness(0.9, false)).toBe('black')
  })
  it('counts the darkening band under the text of a photo', () => {
    expect(logoColorForBrightness(0.7, false)).toBe('black')
    expect(logoColorForBrightness(0.7, true)).toBe('white')
  })
})

describe('cornerBrightness', () => {
  it('measures the bottom right corner, where the logo goes', async () => {
    expect(await cornerBrightness(await solid('#000000'))).toBeLessThan(0.05)
    expect(await cornerBrightness(await solid('#ffffff'))).toBeGreaterThan(0.95)
  })
})

describe('resolveLogoColors', () => {
  const base: PillSlide = { id: 'a', kind: 'photo', image_url: null, text: '', credit: '', brands: ['untold'], logo: 'auto', logo_color: null }
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
