import { describe, it, expect, vi, beforeEach } from 'vitest'
import { unzipSync } from 'fflate'

let pill: any = null
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: pill }) }) }) }) }) }) }),
}))
const renderSlideImage = vi.fn(async (slide: { text: string }) => Buffer.from(`jpeg:${slide.text}`))
vi.mock('@/lib/pill-slide-image', () => ({ renderSlideImage: (slide: { text: string }) => renderSlideImage(slide) }))

import { GET } from '@/app/api/pill-slides/[slug]/route'
import { newSlide } from '@/lib/pill-slides'

const call = (query = '') => GET({ nextUrl: new URL(`https://untold.example/api/pill-slides/mi-pildora?${query}`) } as any, { params: Promise.resolve({ slug: 'mi-pildora' }) })
const slide = (text: string) => ({ ...newSlide('photo'), image_url: 'https://cdn/a.png', text })

describe('GET /api/pill-slides/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pill = { slug: 'mi-pildora', source_locale: 'es', pill_meta: { format: 'carousel', slides: [slide('Uno'), slide('Dos'), slide('Tres')], slide_translations: { en: [] } } }
  })

  it('gives one slide as a JPEG', async () => {
    const res = await call('n=2')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/jpeg')
    expect(res.headers.get('content-disposition')).toContain('mi-pildora-02.jpg')
    expect(renderSlideImage).toHaveBeenCalledTimes(1)
    expect(renderSlideImage.mock.calls[0][0].text).toBe('Dos')
  })

  it('gives all the slides in a ZIP, in order, named by number', async () => {
    const res = await call('locale=es')
    expect(res.headers.get('content-type')).toBe('application/zip')
    expect(res.headers.get('content-disposition')).toContain('mi-pildora-laminas.zip')
    const files = unzipSync(new Uint8Array(await res.arrayBuffer()))
    expect(Object.keys(files)).toEqual(['mi-pildora-01.jpg', 'mi-pildora-02.jpg', 'mi-pildora-03.jpg'])
    expect(Buffer.from(files['mi-pildora-02.jpg']).toString()).toBe('jpeg:Dos')
  })

  it('draws the texts in the language asked, where they are translated', async () => {
    const slides = pill.pill_meta.slides
    pill.pill_meta.slide_translations = { en: slides.map((s: any, i: number) => ({ id: s.id, text: ['One', 'Two', 'Three'][i] })) }
    await call('n=1&locale=en')
    expect(renderSlideImage.mock.calls[0][0].text).toBe('One')
  })

  it('is not found for a slide that does not exist, or a pill that is not a published carousel', async () => {
    expect((await call('n=4')).status).toBe(404)
    pill = { ...pill, pill_meta: { format: 'text', slides: [] } }
    expect((await call()).status).toBe(404)
    pill = null
    expect((await call('n=1')).status).toBe(404)
  })
})
