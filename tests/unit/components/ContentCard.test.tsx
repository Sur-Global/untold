import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ContentCard } from '@/components/content/ContentCard'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => 'en',
}))

const base = {
  contentId: '1',
  slug: 'test-slug',
  title: 'Test Title',
  publishedAt: '2026-03-21T00:00:00Z',
  likesCount: 42,
  authorName: 'Jane Doe',
  authorSlug: 'jane-doe',
}

describe('ContentCard', () => {
  it('shows the like count and the save button, unless the card is asked to hide them (the home page does)', () => {
    const shown = render(<ContentCard {...base} type="article" />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(shown.container.querySelector('button')).toBeTruthy()
    shown.unmount()
    const hidden = render(<ContentCard {...base} type="article" hideActions />)
    expect(screen.queryByText('42')).toBeNull()
    expect(hidden.container.querySelector('button')).toBeNull()
  })

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
    // Duration renders twice by design: once as a badge over the thumbnail,
    // once in the meta row below the card body.
    expect(screen.getAllByText('15:30').length).toBeGreaterThan(0)
  })

  it('renders pill card with accent color', () => {
    const { container } = render(
      <ContentCard {...base} type="pill" accentColor="#6B8E23" />
    )
    expect(container.querySelector('[style]')).toBeTruthy()
  })

  it("the author's photo leads to the creator's page, like the name does", () => {
    render(<ContentCard {...base} type="article" authorAvatarUrl="https://cdn/jane.webp" />)
    const photoLink = screen.getByRole('img', { name: 'Jane Doe' }).closest('a')
    expect(photoLink).toHaveAttribute('href', '/author/jane-doe')
    const links = screen.getAllByRole('link', { name: 'Jane Doe' })
    expect(links).toHaveLength(2) // the photo and the name
    links.forEach((link) => expect(link).toHaveAttribute('href', '/author/jane-doe'))
  })

  it('shows the initial without a link when the author has no profile page', () => {
    render(<ContentCard {...base} authorSlug={null} type="article" />)
    expect(screen.getByText('J').closest('a')).toBeNull()
  })

  it('designs a card (colour, icon, kind of content) when there is no cover picture, without repeating the title', () => {
    const { container } = render(<ContentCard {...base} type="video" />)
    const auto = container.querySelector('[data-auto-cover]')
    expect(auto).toBeTruthy()
    expect(auto).toHaveTextContent('create.video')
    expect(auto).not.toHaveTextContent('Test Title')
    expect(container.querySelector('img[alt="Test Title"]')).toBeNull()
    expect(screen.getAllByText('Test Title')).toHaveLength(1)
  })

  it('shows a podcast cover whole as a square, and a pill image without cropping', () => {
    const podcast = render(<ContentCard {...base} type="podcast" coverImageUrl="https://cdn/podcast.webp" />)
    expect(podcast.container.querySelector('img[alt="Test Title"]')).toHaveClass('aspect-square')
    expect(podcast.container.querySelector('[data-auto-cover]')).toBeNull()
    podcast.unmount()
    const pill = render(<ContentCard {...base} type="pill" coverImageUrl="https://cdn/pill.png" accentColor="#6B8E23" />)
    expect(pill.container.querySelector('img[alt="Test Title"]')).toHaveClass('object-contain')
  })

  it('crops a video cover to 16:9 like before', () => {
    const { container } = render(<ContentCard {...base} type="video" coverImageUrl="https://cdn/video.webp" />)
    expect(container.querySelector('img[alt="Test Title"]')).toHaveClass('object-cover')
  })
})
