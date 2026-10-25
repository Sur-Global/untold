import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AdBanner } from '@/components/home/AdBanner'
import { DEFAULT_BANNER } from '@/lib/home-banners'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const copy = { adLabel: 'Advertisement', eyebrow: 'Write on UNTOLD', title: 'Have a story?', text: 'Tell it here.', cta: 'Publish' }

describe('AdBanner', () => {
  it('both promos are on the brand’s lime, and a promo without a small line does not show an empty one', () => {
    for (const slot of ['top', 'bottom'] as const) {
      const { container, unmount } = render(<AdBanner slot={slot} banner={DEFAULT_BANNER} copy={{ ...copy, eyebrow: undefined }} houseLink="/x" />)
      const card = container.querySelector('a > div') as HTMLElement
      expect(card.style.background).toMatch(/210, 254, 115|#d2fe73/i)
      expect(container.querySelector('p.uppercase')).toBeNull()
      unmount()
    }
    render(<AdBanner slot="top" banner={DEFAULT_BANNER} copy={copy} houseLink="/x" />)
    expect(screen.getByText('Write on UNTOLD')).toBeInTheDocument()
  })

  it('shows UNTOLD’s own promo, linking to its default page, while no picture is set', () => {
    render(<AdBanner slot="top" banner={DEFAULT_BANNER} copy={copy} houseLink="/create" />)
    expect(screen.getByText('Have a story?')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/create')
    expect(screen.queryByText('Advertisement')).not.toBeInTheDocument()
  })

  it('shows the uploaded picture, opening the link in a new tab marked as sponsored', () => {
    render(
      <AdBanner
        slot="bottom"
        banner={{ ...DEFAULT_BANNER, imageUrl: 'https://cdn/x.webp', mobileImageUrl: 'https://cdn/x-m.webp', linkUrl: 'https://brand.com', altText: 'Brand X' }}
        copy={copy}
        houseLink="https://surglobal.io"
      />,
    )
    expect(screen.getByRole('img', { name: 'Brand X' })).toHaveAttribute('src', 'https://cdn/x.webp')
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://brand.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('sponsored')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(document.querySelector('source')).toHaveAttribute('srcset', 'https://cdn/x-m.webp')
    // the house promo is not shown behind a picture
    expect(screen.queryByText('Have a story?')).not.toBeInTheDocument()
  })

  it('leaves the picture unclickable when no link was set', () => {
    render(<AdBanner slot="top" banner={{ ...DEFAULT_BANNER, imageUrl: 'https://cdn/x.webp' }} copy={copy} houseLink="/create" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows the advertisement label, with the advertiser, when asked to', () => {
    render(
      <AdBanner slot="top" banner={{ ...DEFAULT_BANNER, imageUrl: 'https://cdn/x.webp', showLabel: true, sponsor: 'Brand X' }} copy={copy} houseLink="/create" />,
    )
    expect(screen.getByText('Advertisement · Brand X')).toBeInTheDocument()
  })

  it('renders nothing when switched off', () => {
    const { container } = render(<AdBanner slot="top" banner={{ ...DEFAULT_BANNER, enabled: false }} copy={copy} houseLink="/create" />)
    expect(container).toBeEmptyDOMElement()
  })
})
