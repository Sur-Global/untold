import { describe, it, expect, vi } from 'vitest'
import sharp from 'sharp'

// A light grey picture (brightness 0.7): a black logo is right for it, unless the text puts a dark band at the bottom
const grey = sharp({ create: { width: 200, height: 250, channels: 3, background: '#b3b3b3' } }).png().toBuffer()
vi.mock('@/lib/safe-fetch-image', () => ({ fetchImageFromUrl: async () => grey }))

import { resolveLogoColors } from '@/lib/slide-logo'
import { TEXT_DEFAULTS, type PillSlide } from '@/lib/pill-slides'

const photo = (extra: Partial<PillSlide>): PillSlide => ({
  id: 'a', kind: 'photo', image_url: 'https://cdn.example/a.png', text: 'Hola', credit: '', ...TEXT_DEFAULTS, brands: ['untold'], logo: 'auto', logo_color: null, ...extra,
})

describe('the automatic logo colour looks at where the text sits', () => {
  it('white text at the bottom darkens the corner, so the logo is white; at the top or the middle it does not, so it is black', async () => {
    const [bottom, top, middle, none] = await resolveLogoColors([
      photo({ text_y: 'bottom' }), photo({ text_y: 'top' }), photo({ text_y: 'middle' }), photo({ text: '' }),
    ])
    expect(bottom.logo_color).toBe('white')
    expect(top.logo_color).toBe('black')
    expect(middle.logo_color).toBe('black')
    expect(none.logo_color).toBe('black')
  })
  it('black text at the bottom lightens the corner, so a mid-dark picture gets a black logo', async () => {
    const [out] = await resolveLogoColors([photo({ text_y: 'bottom', text_color: 'black' })])
    expect(out.logo_color).toBe('black')
  })
})
