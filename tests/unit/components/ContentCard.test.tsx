import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ContentCard } from '@/components/content/ContentCard'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const base = {
  id: '1',
  slug: 'test-slug',
  title: 'Test Title',
  publishedAt: '2026-03-21T00:00:00Z',
  likesCount: 42,
  authorName: 'Jane Doe',
  authorSlug: 'jane-doe',
}

describe('ContentCard', () => {
  it('renders article card with title and author', () => {
    render(<ContentCard {...base} type="article" excerpt="Some excerpt" />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('links to the correct slug path for articles', () => {
    render(<ContentCard {...base} type="article" />)
    const link = screen.getAllByRole('link')[0]
    expect(link.getAttribute('href')).toContain('/articles/test-slug')
  })

  it('renders video card with duration', () => {
    render(<ContentCard {...base} type="video" duration="15:30" />)
    expect(screen.getByText('15:30')).toBeInTheDocument()
  })

  it('renders pill card with accent color', () => {
    const { container } = render(
      <ContentCard {...base} type="pill" accentColor="#6B8E23" />
    )
    expect(container.querySelector('[style]')).toBeTruthy()
  })
})
