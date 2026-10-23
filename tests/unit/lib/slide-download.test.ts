import { describe, it, expect, vi, afterEach } from 'vitest'
import { canSharePictures, downloadSlidesZip, fetchSlideFiles, slidesUrl } from '@/lib/slide-download'

describe('slidesUrl', () => {
  it('addresses all the slides of a pill, or one of them, in a language', () => {
    expect(slidesUrl('mi-pildora', 'es')).toBe('/api/pill-slides/mi-pildora?locale=es')
    expect(slidesUrl('mi-pildora', 'pt', 3)).toBe('/api/pill-slides/mi-pildora?locale=pt&n=3')
  })
})

describe('fetchSlideFiles', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('fetches every slide as a named JPEG file, in order', async () => {
    const fetchMock = vi.fn(async () => new Response(new Blob(['x'], { type: 'image/jpeg' })))
    vi.stubGlobal('fetch', fetchMock)
    const files = await fetchSlideFiles('crisis', 'es', 3)
    expect(files.map((f) => f.name)).toEqual(['crisis-01.jpg', 'crisis-02.jpg', 'crisis-03.jpg'])
    expect(files.every((f) => f.type === 'image/jpeg')).toBe(true)
    expect(fetchMock.mock.calls.map((c) => (c as unknown[])[0])).toEqual([slidesUrl('crisis', 'es', 1), slidesUrl('crisis', 'es', 2), slidesUrl('crisis', 'es', 3)])
  })
  it('fails when a slide cannot be drawn', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })))
    await expect(fetchSlideFiles('crisis', 'es', 2)).rejects.toThrow(/failed/)
  })
})

describe('downloadSlidesZip', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('saves the ZIP with the name of the pill', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['zip'], { type: 'application/zip' }))))
    URL.createObjectURL = vi.fn(() => 'blob:zip')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await downloadSlidesZip('crisis', 'es')
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })
  it('fails when the ZIP cannot be made', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })))
    await expect(downloadSlidesZip('crisis', 'es')).rejects.toThrow(/failed/)
  })
})

describe('canSharePictures', () => {
  afterEach(() => { vi.unstubAllGlobals(); Object.assign(navigator, { share: undefined, canShare: undefined }) })
  const phone = (coarse: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: coarse && query === '(pointer: coarse)', media: query, addEventListener() {}, removeEventListener() {} }))
  it('is true only on a phone whose share sheet takes pictures', () => {
    Object.assign(navigator, { share: vi.fn(), canShare: vi.fn(() => true) })
    phone(true)
    expect(canSharePictures()).toBe(true)
    phone(false)
    expect(canSharePictures()).toBe(false)
    phone(true)
    Object.assign(navigator, { canShare: vi.fn(() => false) })
    expect(canSharePictures()).toBe(false)
    Object.assign(navigator, { share: undefined, canShare: undefined })
    expect(canSharePictures()).toBe(false)
  })
})
