import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TopicStrip } from '@/components/content/TopicStrip'
import { TopicKicker } from '@/components/content/TopicKicker'
import { OtherTags } from '@/components/content/OtherTags'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, scroll: _s, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))

const tags = [
  { slug: 'ciudades', name: 'ciudades', count: 2, isTopic: false },
  { slug: 'diseno', name: 'diseño', count: 9, isTopic: true },
  { slug: 'futuros', name: 'futuros', count: 5, isTopic: true },
  { slug: 'arte', name: 'arte', count: 1, isTopic: true },
]
const props = { tags, basePath: '/videos', label: 'Explora por tema', exploreLabel: 'Explorar', allLabel: 'Todos', allTopicsLabel: 'Todos los temas →' }

describe('TopicStrip', () => {
  it('is one row: "Explore", "All", the topics with the most content first, and a link to all the topics', () => {
    render(<TopicStrip {...props} />)
    const nav = screen.getByRole('navigation', { name: 'Explora por tema' })
    expect(nav).toHaveTextContent('Explorar')
    const links = screen.getAllByRole('link').map((a) => a.textContent)
    expect(links).toEqual(['Todos', 'diseño', 'futuros', 'arte', 'Todos los temas →'])
    expect(screen.getByRole('link', { name: 'Todos los temas →' })).toHaveAttribute('href', '/topics')
  })

  it('does not offer a tag that is not a topic', () => {
    render(<TopicStrip {...props} />)
    expect(screen.queryByRole('link', { name: 'ciudades' })).not.toBeInTheDocument()
  })

  it('each topic filters the listing', () => {
    render(<TopicStrip {...props} />)
    expect(screen.getByRole('link', { name: 'diseño' })).toHaveAttribute('href', '/videos?tag=diseno')
    expect(screen.getByRole('link', { name: 'Todos' })).toHaveAttribute('href', '/videos')
  })

  it('shows the chosen topic as current; clicking it again clears the filter', () => {
    render(<TopicStrip {...props} activeSlug="futuros" />)
    expect(screen.getByRole('link', { name: 'futuros' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: 'futuros' })).toHaveAttribute('href', '/videos')
    expect(screen.getByRole('link', { name: 'Todos' })).not.toHaveAttribute('aria-current')
  })

  it('keeps a filtered tag that is not a topic visible and current', () => {
    render(<TopicStrip {...props} activeSlug="ciudades" />)
    expect(screen.getByRole('link', { name: 'ciudades' })).toHaveAttribute('aria-current', 'true')
  })

  it('keeps the other filters of the page in its links', () => {
    render(<TopicStrip {...props} basePath="/articles" activeSlug="futuros" keep={{ q: 'ia', filter: 'recent' }} />)
    expect(screen.getByRole('link', { name: 'diseño' })).toHaveAttribute('href', '/articles?q=ia&filter=recent&tag=diseno')
    expect(screen.getByRole('link', { name: 'Todos' })).toHaveAttribute('href', '/articles?q=ia&filter=recent')
  })

  it('shows nothing when there are no topics', () => {
    const { container } = render(<TopicStrip {...props} tags={[tags[0]]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('TopicKicker', () => {
  it('shows the main topic above the title and one more to explore', () => {
    render(<TopicKicker primary={{ slug: 'ia', name: 'Inteligencia artificial' }} related={{ slug: 'tecnologia', name: 'Tecnología' }} exploreAlso="Explora también" />)
    expect(screen.getByRole('link', { name: 'Inteligencia artificial' })).toHaveAttribute('href', '/tag/ia')
    expect(screen.getByText(/Explora también/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tecnología' })).toHaveAttribute('href', '/tag/tecnologia')
  })

  it('shows only the main topic when there is nothing to suggest', () => {
    render(<TopicKicker primary={{ slug: 'ia', name: 'IA' }} related={null} exploreAlso="Explora también" />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByText(/Explora también/)).not.toBeInTheDocument()
  })

  it('shows nothing when the content has no topic', () => {
    const { container } = render(<TopicKicker primary={null} related={null} exploreAlso="Explora también" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('OtherTags', () => {
  it('lists the plain tags small, each a link to its page', () => {
    render(<OtherTags tags={[{ slug: 'ai', name: 'AI' }, { slug: 'x', name: 'X' }]} label="Etiquetas" />)
    expect(screen.getByText('Etiquetas:')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'AI' })).toHaveAttribute('href', '/tag/ai')
  })

  it('shows nothing without tags', () => {
    const { container } = render(<OtherTags tags={[]} label="Etiquetas" />)
    expect(container).toBeEmptyDOMElement()
  })
})
