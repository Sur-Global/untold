import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { HomePillCard, PillsRail } from '@/app/[locale]/_home-cards'

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

describe('HomePillCard', () => {
  it('shows the slide whole in a vertical 4:5 frame, not in a wide box', () => {
    const { container } = render(<HomePillCard {...pill} />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://cdn/slide-1.webp')
    expect(img.className).toContain('object-cover')
    expect((img.parentElement!.parentElement as HTMLElement).style.aspectRatio).toBe('4 / 5')
  })

  it('has its topic on the slide, and the title and the author below, each a link', () => {
    render(<HomePillCard {...pill} />)
    expect(screen.getByRole('link', { name: 'sostenibilidad' })).toHaveAttribute('href', '/tag/sostenibilidad')
    expect(screen.getByRole('link', { name: 'El mito del crecimiento' })).toHaveAttribute('href', '/pills/el-mito-del-crecimiento')
    // the photo and the name of the author both lead to the author's page
    for (const link of screen.getAllByRole('link', { name: 'Cristian Situ' })) expect(link).toHaveAttribute('href', '/author/cristian-situ')
  })

  it('does not repeat the title for people who cannot see the picture (the picture link is hidden from them)', () => {
    const { container } = render(<HomePillCard {...pill} />)
    const pictureLink = container.querySelector('a[aria-hidden="true"]')!
    expect(pictureLink).toHaveAttribute('tabindex', '-1')
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('has no summary and no share button on the home page', () => {
    render(<HomePillCard {...pill} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('a pill with no picture shows a block in its brand colour', () => {
    const { container } = render(<HomePillCard {...pill} coverImageUrl={null} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect((container.querySelector('[style*="aspect-ratio"]') as HTMLElement).style.background).toMatch(/rgb\(161, 161, 233\)|#a1a1e9/i)
  })

  it('works without topic and without author', () => {
    render(<HomePillCard {...pill} categoryTag={null} authorName={null} />)
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
    expect(screen.getByRole('region', { name: 'Píldoras de Conocimiento' })).toContainElement(screen.getByText('El mito del crecimiento'))
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
