import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PillCarousel } from '@/components/pills/PillCarousel'
import { SlideView } from '@/components/pills/SlideView'
import type { PillSlide } from '@/lib/pill-slides'

const messages: Record<string, string> = { carouselPrev: 'Lámina anterior', carouselNext: 'Lámina siguiente', slideOf: 'Lámina {n} de {total}' }
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    Object.entries(values ?? {}).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), messages[key] ?? key),
}))

const slide = (extra: Partial<PillSlide>): PillSlide => ({ id: 'a', kind: 'photo', image_url: 'https://cdn/a.webp', text: '', credit: '', logo: 'auto', logo_color: 'white', ...extra })
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
    expect((container.firstChild as HTMLElement).style.background).toMatch(/169, 168, 233|#a9a8e9/i)
    expect(container.querySelector('[data-logo="white"]')).toBeTruthy()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Infórmate', 'Muévete'])
  })
  it('uses the black logo on a light picture and none when the slide has no logo', () => {
    const light = render(<SlideView slide={slides[2]} />)
    expect(light.container.querySelector('[data-logo="black"]')).toHaveAttribute('src', '/logo-slide-black.png')
    light.unmount()
    const none = render(<SlideView slide={slide({ kind: 'image', logo: 'none' })} />)
    expect(none.container.querySelector('[data-logo]')).toBeNull()
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
