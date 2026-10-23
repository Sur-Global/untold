import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TagCloud } from '@/components/content/TagCloud'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, scroll: _s, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))

const tags = [
  { slug: 'ciudades', name: 'ciudades', count: 2 },
  { slug: 'diseno', name: 'diseño', count: 9 },
  { slug: 'futuros', name: 'futuros', count: 5 },
]
const props = { tags, basePath: '/videos', label: 'Explora por tema', allLabel: 'Todos' }

describe('TagCloud', () => {
  it('shows each topic as a link that filters the listing, bigger the more content it has', () => {
    render(<TagCloud {...props} />)
    expect(screen.getByRole('navigation', { name: 'Explora por tema' })).toBeInTheDocument()
    const big = screen.getByRole('link', { name: 'diseño' })
    const small = screen.getByRole('link', { name: 'ciudades' })
    expect(big).toHaveAttribute('href', '/videos?tag=diseno')
    expect(parseInt(big.style.fontSize, 10)).toBeGreaterThan(parseInt(small.style.fontSize, 10))
    expect(screen.queryByRole('link', { name: 'Todos' })).not.toBeInTheDocument()
  })
  it('highlights the chosen topic, which links back to the whole listing, and offers "Todos"', () => {
    render(<TagCloud {...props} activeSlug="futuros" />)
    expect(screen.getByRole('link', { name: 'futuros' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: 'futuros' })).toHaveAttribute('href', '/videos')
    expect(screen.getByRole('link', { name: 'Todos' })).toHaveAttribute('href', '/videos')
  })
  it('shows nothing when there are no topics', () => {
    const { container } = render(<TagCloud {...props} tags={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('keeps the page\'s other filters (search, order) in every link', () => {
    render(<TagCloud {...props} basePath="/articles" activeSlug="futuros" keep={{ q: 'ia', filter: 'recent' }} />)
    expect(screen.getByRole('link', { name: 'diseño' })).toHaveAttribute('href', '/articles?q=ia&filter=recent&tag=diseno')
    expect(screen.getByRole('link', { name: 'futuros' })).toHaveAttribute('href', '/articles?q=ia&filter=recent')
    expect(screen.getByRole('link', { name: 'Todos' })).toHaveAttribute('href', '/articles?q=ia&filter=recent')
  })

  it('leaves out filters that are not set', () => {
    render(<TagCloud {...props} basePath="/articles" keep={{ q: undefined, filter: undefined }} />)
    expect(screen.getByRole('link', { name: 'diseño' })).toHaveAttribute('href', '/articles?tag=diseno')
  })
})
