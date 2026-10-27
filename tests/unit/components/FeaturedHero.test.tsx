import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FeaturedHero, type HeroItem } from '@/components/content/FeaturedHero'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))

const item = (n: number, extra: Partial<HeroItem> = {}): HeroItem => ({
  href: `/articles/pieza-${n}`,
  title: `Pieza ${n}`,
  imageUrl: `https://cdn/${n}.webp`,
  topic: { name: 'futuros', slug: 'futuros' },
  authorName: 'Elsie Ralston',
  meta: '23 min de lectura',
  ...extra,
})

describe('FeaturedHero', () => {
  it('shows up to three starred pieces: one big and two beside it', () => {
    const { container } = render(<FeaturedHero kind="article" label="Destacados" items={[item(1), item(2), item(3), item(4)]} />)
    expect(screen.getByRole('region', { name: 'Destacados' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /^Pieza \d$/ }).map((a) => a.getAttribute('aria-label'))).toEqual(['Pieza 1', 'Pieza 2', 'Pieza 3'])
    expect(container.querySelector('.lg\\:grid-cols-\\[1\\.7fr_1fr\\]')).toBeInTheDocument()
  })

  it('each piece is a whole-card link, with its title, author and reading time over the picture', () => {
    render(<FeaturedHero kind="article" label="Destacados" items={[item(1)]} />)
    expect(screen.getByRole('link', { name: 'Pieza 1' })).toHaveAttribute('href', '/articles/pieza-1')
    expect(screen.getByText('Pieza 1')).toBeInTheDocument()
    expect(screen.getByText('Elsie Ralston · 23 min de lectura')).toBeInTheDocument()
  })

  it('shows its topic as a link of its own, above the card link', () => {
    render(<FeaturedHero kind="article" label="Destacados" items={[item(1)]} />)
    expect(screen.getByRole('link', { name: 'futuros' })).toHaveAttribute('href', '/tag/futuros')
  })

  it('with a single piece, it is big and alone (no empty column)', () => {
    const { container } = render(<FeaturedHero kind="article" label="Destacados" items={[item(1)]} />)
    expect(container.querySelector('.lg\\:grid-cols-\\[1\\.7fr_1fr\\]')).toBeNull()
  })

  it('videos carry a play button on every piece, and article hero does not', () => {
    const { container, rerender } = render(<FeaturedHero kind="video" label="Destacados" items={[item(1, { href: '/videos/v1', meta: '33:00' }), item(2, { href: '/videos/v2' })]} />)
    expect(container.querySelectorAll('svg path[fill="#fff"]')).toHaveLength(2)
    expect(screen.getByText('Elsie Ralston · 33:00')).toBeInTheDocument()
    rerender(<FeaturedHero kind="article" label="Destacados" items={[item(1)]} />)
    expect(container.querySelector('svg path[fill="#fff"]')).toBeNull()
  })

  it('works without picture, topic, author or length', () => {
    const { container } = render(<FeaturedHero kind="article" label="Destacados" items={[item(1, { imageUrl: null, topic: null, authorName: null, meta: null })]} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByRole('link', { name: 'futuros' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pieza 1' })).toBeInTheDocument()
  })

  it('shows nothing when there is nothing starred', () => {
    const { container } = render(<FeaturedHero kind="article" label="Destacados" items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
