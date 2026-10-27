import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { HomePillCard, PillsRail } from '@/app/[locale]/_home-cards'
import type { PillSlide } from '@/lib/pill-slides'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => ({ pills: 'Píldoras de Conocimiento', railPrevious: 'Anterior', railNext: 'Siguiente' } as Record<string, string>)[key] ?? key,
}))

const pill = {
  slug: 'el-mito-del-crecimiento',
  title: 'El mito del crecimiento',
  coverImageUrl: 'https://cdn/slide-1.webp',
  categoryTag: 'sostenibilidad',
  categoryTagSlug: 'sostenibilidad',
  accentColor: '#A1A1E9',
  authorName: 'Cristian Situ',
  authorSlug: 'cristian-situ',
  authorAvatarUrl: null,
}
const coverSlide: PillSlide = { id: 's1', kind: 'photo', image_url: 'https://cdn/slide-1.webp', text: 'El mito del crecimiento', credit: '', text_x: 'left', text_y: 'top', text_size: 'xl', text_color: 'white', text_bg: 'lilac', brands: ['untold'], logo: 'auto', logo_color: 'white' }

describe('HomePillCard', () => {
  it('shows the first slide as it was designed: the title over the photo, in a vertical 4:5 frame', () => {
    const { container } = render(<HomePillCard {...pill} coverSlide={coverSlide} />)
    const slide = container.querySelector('[data-slide-kind="photo"]')!
    expect(slide).toBeInTheDocument()
    expect(slide.querySelector('img')).toHaveAttribute('src', 'https://cdn/slide-1.webp')
    expect(slide).toHaveTextContent('El mito del crecimiento')
    expect((slide as HTMLElement).style.aspectRatio).toBe('4 / 5')
    // and the logos the author chose
    expect(slide.querySelector('[data-brand="untold"]')).toBeInTheDocument()
  })

  it('the whole slide is a link to the pill, named with its title', () => {
    render(<HomePillCard {...pill} coverSlide={coverSlide} />)
    expect(screen.getByRole('link', { name: 'El mito del crecimiento' })).toHaveAttribute('href', '/pills/el-mito-del-crecimiento')
  })

  it('has its topic and its author below the slide, each a link; the title is not repeated there', () => {
    render(<HomePillCard {...pill} coverSlide={coverSlide} />)
    expect(screen.getByRole('link', { name: 'sostenibilidad' })).toHaveAttribute('href', '/tag/sostenibilidad')
    // the photo and the name of the author both lead to the author's page
    for (const link of screen.getAllByRole('link', { name: 'Cristian Situ' })) expect(link).toHaveAttribute('href', '/author/cristian-situ')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('has no summary and no share button on the home page', () => {
    render(<HomePillCard {...pill} coverSlide={coverSlide} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('a pill without a designed slide (a text pill) shows its title over its picture, on a shade that keeps it readable', () => {
    const { container } = render(<HomePillCard {...pill} />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn/slide-1.webp')
    const title = screen.getByText('El mito del crecimiento', { selector: 'span' })
    expect(title.style.color).toMatch(/rgb\(255, 255, 255\)|#fff/i)
    expect(container.querySelector('[style*="linear-gradient"]')).toBeInTheDocument()
  })

  it('a pill with no picture shows its title on a block in its brand colour', () => {
    const { container } = render(<HomePillCard {...pill} coverImageUrl={null} />)
    expect(container.querySelector('img')).toBeNull()
    expect((container.querySelector('a[aria-label]') as HTMLElement).style.background).toMatch(/rgb\(161, 161, 233\)|#a1a1e9/i)
    expect(screen.getByText('El mito del crecimiento', { selector: 'span' })).toBeInTheDocument()
  })

  it('works without topic and without author', () => {
    render(<HomePillCard {...pill} coverSlide={coverSlide} categoryTag={null} authorName={null} />)
    expect(screen.queryByRole('link', { name: 'sostenibilidad' })).not.toBeInTheDocument()
    expect(screen.queryByText('Cristian Situ')).not.toBeInTheDocument()
  })
})

describe('PillsRail', () => {
  const original = { scrollWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth'), clientWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth') }
  afterEach(() => {
    for (const [key, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor)
      else delete (HTMLElement.prototype as any)[key]
    }
  })
  const sizes = (scrollWidth: number, clientWidth: number) => {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => scrollWidth })
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => clientWidth })
  }

  it('is a region of its own that holds the pills', () => {
    render(<PillsRail><HomePillCard {...pill} /></PillsRail>)
    expect(screen.getByRole('region', { name: 'Píldoras de Conocimiento' })).toContainElement(screen.getByText('El mito del crecimiento', { selector: 'span' }))
  })

  it('shows no arrows when everything fits', () => {
    sizes(800, 800)
    render(<PillsRail><HomePillCard {...pill} /></PillsRail>)
    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument()
  })

  it('shows the arrows when there is more to slide to: "previous" is off at the start', () => {
    sizes(2000, 800)
    render(<PillsRail><HomePillCard {...pill} /></PillsRail>)
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  it('slides a page when an arrow is pressed', () => {
    sizes(2000, 800)
    const scrollBy = vi.fn()
    ;(HTMLElement.prototype as any).scrollBy = scrollBy
    render(<PillsRail><HomePillCard {...pill} /></PillsRail>)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(scrollBy).toHaveBeenCalledWith({ left: 720, behavior: 'smooth' })
  })
})
