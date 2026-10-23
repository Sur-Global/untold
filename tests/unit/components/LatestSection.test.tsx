import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LatestSection, type LatestItem, type LatestEditorial } from '@/components/home/LatestSection'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...rest}>{children}</a>,
}))

const labels = { title: 'Lo más reciente', viewAll: 'Ver todo', editorial: 'Editorial', readMore: 'Leer más', newBadge: 'Nuevo' }
const item = (n: number, extra: Partial<LatestItem> = {}): LatestItem => ({
  slug: `articulo-${n}`, title: `Artículo ${n}`, coverImageUrl: `https://cdn/${n}.webp`, categoryTag: 'medios',
  authorName: 'Mercedes Baltazar', dateLabel: '12 sep', readTimeLabel: '12 min de lectura', isNew: false, ...extra,
})
const editorial: LatestEditorial = {
  slug: 'viejos-mitos', title: 'Viejos mitos, nuevas amenazas', excerpt: 'Un editorial sobre la IA.',
  authorName: 'Javier Wong Q', authorSlug: 'javier-wong-q', authorAvatarUrl: 'https://cdn/javier.webp', dateLabel: '13 sep',
}

describe('LatestSection', () => {
  it('shows the title without any subtitle, a "view all" link and the newest articles', () => {
    render(<LatestSection items={[item(1), item(2)]} editorial={null} labels={labels} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Lo más reciente' })).toBeInTheDocument()
    expect(screen.queryByText(/publicado esta semana/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver todo/ })).toHaveAttribute('href', '/articles')
    expect(screen.getByRole('link', { name: /Artículo 1/ })).toHaveAttribute('href', '/articles/articulo-1')
    expect(screen.getAllByText('Mercedes Baltazar · 12 sep · 12 min de lectura')).toHaveLength(2)
  })

  it('marks recent articles as new', () => {
    render(<LatestSection items={[item(1, { isNew: true }), item(2)]} editorial={null} labels={labels} />)
    expect(screen.getAllByText('Nuevo')).toHaveLength(1)
  })

  it('shows the editorial card signed with the profile of whoever wrote it', () => {
    render(<LatestSection items={[item(1)]} editorial={editorial} labels={labels} />)
    const card = screen.getByRole('article')
    expect(within(card).getByText('Editorial')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'Viejos mitos, nuevas amenazas' })).toHaveAttribute('href', '/articles/viejos-mitos')
    expect(within(card).getByRole('link', { name: 'Javier Wong Q' })).toHaveAttribute('href', '/author/javier-wong-q')
    expect(within(card).getByText('13 sep')).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: /Leer más/ })).toHaveAttribute('href', '/articles/viejos-mitos')
  })

  it('shows only the list when there is no editorial', () => {
    render(<LatestSection items={[item(1), item(2), item(3), item(4)]} editorial={null} labels={labels} />)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4)
  })

  it('links the editorial card to its numbered issue when it belongs to one', () => {
    render(<LatestSection items={[item(1)]} editorial={{ ...editorial, issue: { label: 'Septiembre de 2026', href: '/issues/2026/9' } }} labels={labels} />)
    const card = screen.getByRole('article')
    expect(within(card).getByRole('link', { name: 'Editorial · Septiembre de 2026' })).toHaveAttribute('href', '/issues/2026/9')
  })

  it('renders nothing when there is nothing to show', () => {
    const { container } = render(<LatestSection items={[]} editorial={null} labels={labels} />)
    expect(container).toBeEmptyDOMElement()
  })
})
