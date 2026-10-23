import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PillCarousel } from '@/components/pills/PillCarousel'
import { SlideView } from '@/components/pills/SlideView'
import { TEXT_DEFAULTS, type PillSlide } from '@/lib/pill-slides'

const messages: Record<string, string> = { carouselPrev: 'Lámina anterior', carouselNext: 'Lámina siguiente', slideOf: 'Lámina {n} de {total}' }
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    Object.entries(values ?? {}).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), messages[key] ?? key),
}))

const slide = (extra: Partial<PillSlide>): PillSlide => ({ id: 'a', kind: 'photo', image_url: 'https://cdn/a.webp', text: '', credit: '', ...TEXT_DEFAULTS, brands: ['untold'], logo: 'auto', logo_color: 'white', ...extra })
const slides: PillSlide[] = [
  slide({ id: 'a', text: 'Crisis climática', logo_color: 'white' }),
  slide({ id: 'b', kind: 'text', image_url: null, text: 'La humanidad ha explotado el planeta.\n- Infórmate\n- Muévete', logo: 'white' }),
  slide({ id: 'c', logo_color: 'black', text: '' }),
]

describe('SlideView', () => {
  it('shows the text over a photo, with the logo in the picture’s best colour', () => {
    const { container } = render(<SlideView slide={slides[0]} />)
    expect(screen.getByText('Crisis climática')).toBeInTheDocument()
    expect(container.querySelector('[data-logo="white"]')).toHaveAttribute('src', '/logo-slide-white.png')
  })
  it('puts the text on the brand lilac with the white logo, and turns “-” lines into a list', () => {
    const { container } = render(<SlideView slide={slides[1]} />)
    expect((container.firstChild as HTMLElement).style.background).toMatch(/161, 161, 233|#a1a1e9/i)
    expect(container.querySelector('[data-logo="white"]')).toBeTruthy()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Infórmate', 'Muévete'])
  })
  it('writes the paragraphs of a lilac slide at the same size as its lists (the page’s own paragraph size does not apply)', () => {
    const { container } = render(<SlideView slide={slide({ kind: 'text', image_url: null, text: 'Un párrafo\n- Un punto' })} />)
    const paragraph = container.querySelector('[data-slide-kind="text"] p') as HTMLElement
    expect(paragraph.style.fontSize).toBe('inherit')
    expect(paragraph.style.lineHeight).toBe('inherit')
  })
  it('a text slide can be white with black text and a black logo, bigger, and centred', () => {
    const white = render(<SlideView slide={slide({ kind: 'text', image_url: null, text: 'Hola', text_bg: 'white', text_size: 'l', text_x: 'center', brands: ['surglobal'], logo_color: null })} />)
    const root = white.container.firstChild as HTMLElement
    expect(root.style.background).toMatch(/249, 249, 249|#f9f9f9/i)
    const text = white.container.querySelector('[data-slide-kind="text"] > div.absolute') as HTMLElement
    expect(text.style.color).toBe('rgb(0, 0, 0)')
    expect(text.style.fontSize).toBe('6.4cqw')
    expect(text.style.textAlign).toBe('center')
    expect(text.style.textShadow).toBe('')
    expect(white.container.querySelector('[data-logo="black"]')).toBeTruthy()
  })
  it('puts a light shadow under the text on lilac, like the Figma designs', () => {
    const { container } = render(<SlideView slide={slides[1]} />)
    expect(container.innerHTML).toMatch(/text-shadow/)
  })
  it('uses the black logo on a light picture and none when the slide has no logo', () => {
    const light = render(<SlideView slide={slides[2]} />)
    expect(light.container.querySelector('[data-logo="black"]')).toHaveAttribute('src', '/logo-slide-black.png')
    light.unmount()
    const none = render(<SlideView slide={slide({ kind: 'image', brands: [] })} />)
    expect(none.container.querySelector('[data-logo]')).toBeNull()
  })
  it('shows the SurGlobal logo, or both logos with SurGlobal above UNTOLD', () => {
    const sg = render(<SlideView slide={slide({ brands: ['surglobal'], logo_color: 'black' })} />)
    expect(sg.container.querySelector('[data-brand="surglobal"]')).toHaveAttribute('src', '/logo-slide-surglobal-black.png')
    expect(sg.container.querySelector('[data-brand="untold"]')).toBeNull()
    sg.unmount()
    const both = render(<SlideView slide={slide({ brands: ['untold', 'surglobal'] })} />)
    expect([...both.container.querySelectorAll('[data-brand]')].map((img) => img.getAttribute('data-brand'))).toEqual(['surglobal', 'untold'])
  })
})

describe('text over a photo', () => {
  const textBox = (container: HTMLElement) => container.querySelector('p')!.parentElement as HTMLElement
  const paragraph = (container: HTMLElement) => container.querySelector('p') as HTMLElement

  it('sits in the nine places of the slide', () => {
    const topRight = render(<SlideView slide={slide({ text: 'Hola', brands: [], text_x: 'right', text_y: 'top' })} />)
    expect(textBox(topRight.container).style.justifyContent).toBe('flex-start')
    expect(textBox(topRight.container).style.alignItems).toBe('flex-end')
    expect(paragraph(topRight.container).style.textAlign).toBe('right')
    topRight.unmount()
    const middleCenter = render(<SlideView slide={slide({ text: 'Hola', brands: [], text_x: 'center', text_y: 'middle' })} />)
    expect(textBox(middleCenter.container).style.justifyContent).toBe('center')
    expect(textBox(middleCenter.container).style.alignItems).toBe('center')
    expect(paragraph(middleCenter.container).style.textAlign).toBe('center')
    middleCenter.unmount()
    const bottomLeft = render(<SlideView slide={slide({ text: 'Hola', brands: [], text_x: 'left', text_y: 'bottom' })} />)
    expect(textBox(bottomLeft.container).style.justifyContent).toBe('flex-end')
    expect(textBox(bottomLeft.container).style.alignItems).toBe('flex-start')
  })

  it('has four sizes, from small to extra large', () => {
    const sizes = (['s', 'm', 'l', 'xl'] as const).map((text_size) => {
      const view = render(<SlideView slide={slide({ text: 'Hola', text_size })} />)
      const size = parseFloat(paragraph(view.container).style.fontSize)
      view.unmount()
      return size
    })
    expect(sizes).toEqual([4.6, 6.4, 9, 12.5])
  })

  it('is white or black, with a dark or a light band behind it that follows it to the top, the middle or the bottom', () => {
    const white = render(<SlideView slide={slide({ text: 'Hola', text_y: 'top' })} />)
    expect(paragraph(white.container).style.color).toBe('rgb(255, 255, 255)')
    expect(white.container.querySelector('[aria-hidden][style*="linear-gradient"]')!.getAttribute('style')).toMatch(/linear-gradient\((to bottom, )?rgba\(0, ?0, ?0, ?0\.6\)/)
    white.unmount()
    const black = render(<SlideView slide={slide({ text: 'Hola', text_y: 'bottom', text_color: 'black' })} />)
    expect(paragraph(black.container).style.color).toBe('rgb(17, 17, 17)')
    expect(black.container.querySelector('[aria-hidden][style*="linear-gradient"]')!.getAttribute('style')).toMatch(/to top, rgba\(255, ?255, ?255, ?0\.7\)/)
    black.unmount()
    const middle = render(<SlideView slide={slide({ text: 'Hola', text_y: 'middle' })} />)
    expect(middle.container.querySelector('[aria-hidden][style*="linear-gradient"]')!.getAttribute('style')).toMatch(/top: 22%/)
  })

  it('has no text or band when the photo has no text', () => {
    const { container } = render(<SlideView slide={slide({ text: '' })} />)
    expect(container.querySelector('p')).toBeNull()
    expect(container.querySelector('[style*="linear-gradient"]')).toBeNull()
  })

  it('keeps out of the way of the logos at the bottom right', () => {
    const left = render(<SlideView slide={slide({ text: 'Hola', text_x: 'left', text_y: 'bottom', brands: ['untold'] })} />)
    expect(textBox(left.container).style.right).toBe('32cqw')
    left.unmount()
    const right = render(<SlideView slide={slide({ text: 'Hola', text_x: 'right', text_y: 'bottom', brands: ['untold'] })} />)
    expect(parseFloat(textBox(right.container).style.bottom)).toBeCloseTo(11.7, 1)
    right.unmount()
    const two = render(<SlideView slide={slide({ text: 'Hola', text_x: 'center', text_y: 'bottom', brands: ['untold', 'surglobal'] })} />)
    expect(parseFloat(textBox(two.container).style.bottom)).toBeCloseTo(17, 1)
    two.unmount()
    // a long text at the top or in the middle must not reach them either
    const top = render(<SlideView slide={slide({ text: 'Hola', text_x: 'right', text_y: 'top', brands: ['untold'] })} />)
    expect(textBox(top.container).style.right).toBe('6cqw')
    expect(textBox(top.container).style.top).toBe('6cqw')
    expect(parseFloat(textBox(top.container).style.bottom)).toBeCloseTo(11.7, 1)
    top.unmount()
    const middle = render(<SlideView slide={slide({ text: 'Hola', text_x: 'center', text_y: 'middle', brands: ['untold'] })} />)
    expect(parseFloat(textBox(middle.container).style.top)).toBeCloseTo(11.7, 1)
    expect(parseFloat(textBox(middle.container).style.bottom)).toBeCloseTo(11.7, 1)
    middle.unmount()
    const noLogo = render(<SlideView slide={slide({ text: 'Hola', text_x: 'left', text_y: 'bottom', brands: [] })} />)
    expect(textBox(noLogo.container).style.right).toBe('6cqw')
    noLogo.unmount()
    const noLogoMiddle = render(<SlideView slide={slide({ text: 'Hola', text_x: 'center', text_y: 'middle', brands: [] })} />)
    expect(textBox(noLogoMiddle.container).style.top).toBe('6cqw')
    expect(textBox(noLogoMiddle.container).style.bottom).toBe('6cqw')
  })

  it('shrinks the text until it fits when it is too long for its size (a translation can be longer)', () => {
    const box = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100)
    // the text is 140 tall at 12.5cqw and gets 6% shorter with each step down
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      const size = parseFloat(this.style.fontSize)
      return Number.isNaN(size) ? 0 : (size / 12.5) * 140
    })
    const { container } = render(<SlideView slide={slide({ text: 'Texto largo', text_size: 'xl' })} />)
    const size = parseFloat(paragraph(container).style.fontSize)
    expect(size).toBeLessThan(12.5)
    expect((size / 12.5) * 140).toBeLessThanOrEqual(101)
    box.mockRestore()
    height.mockRestore()
  })

  it('does not shrink a text that fits, nor below the half of its size', () => {
    const { container } = render(<SlideView slide={slide({ text: 'Hola', text_size: 'm' })} />)
    expect(parseFloat(paragraph(container).style.fontSize)).toBe(6.4)
    const box = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(10)
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(1000)
    const never = render(<SlideView slide={slide({ text: 'Un texto interminable', text_size: 'm' })} />)
    expect(parseFloat(paragraph(never.container).style.fontSize)).toBeGreaterThanOrEqual(6.4 * 0.45)
    box.mockRestore()
    height.mockRestore()
  })
})

describe('PillCarousel', () => {
  beforeEach(() => { Element.prototype.scrollTo = vi.fn() as any })

  it('shows every slide, a counter and previous/next buttons', () => {
    render(<PillCarousel slides={slides} label="Crisis climática" />)
    expect(screen.getByRole('group', { name: 'Crisis climática' })).toHaveAttribute('aria-roledescription', 'carousel')
    expect(screen.getAllByRole('group', { name: /Lámina \d de 3/ })).toHaveLength(3)
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lámina anterior' })).toBeDisabled()
  })
  it('moves with the buttons and with the keyboard arrows', () => {
    render(<PillCarousel slides={slides} label="x" />)
    fireEvent.click(screen.getByRole('button', { name: 'Lámina siguiente' }))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lámina anterior' })).not.toBeDisabled()
    fireEvent.keyDown(screen.getAllByRole('group', { name: 'x' })[0].firstChild as HTMLElement, { key: 'ArrowRight' })
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lámina siguiente' })).toBeDisabled()
    fireEvent.keyDown(screen.getAllByRole('group', { name: 'x' })[0].firstChild as HTMLElement, { key: 'ArrowLeft' })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })
  it('shows nothing without slides', () => {
    const { container } = render(<PillCarousel slides={[]} label="x" />)
    expect(container).toBeEmptyDOMElement()
  })
})
