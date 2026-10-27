import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TopicHeader } from '@/components/content/TopicHeader'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))

const props = {
  name: 'futuros',
  eyebrow: 'Tema',
  description: 'Escenarios, imaginarios y estrategias para otros mañanas posibles.',
  countLabel: '33 contenidos',
  exploreLabel: 'Explorar',
  related: [{ slug: 'diseno', name: 'diseño' }, { slug: 'tecnologia', name: 'tecnología' }],
  allTopicsLabel: 'Todos los temas →',
}

describe('TopicHeader (the top of a topic’s page)', () => {
  it('shows the topic, its sentence and how much content it has', () => {
    render(<TopicHeader {...props} />)
    expect(screen.getByRole('heading', { level: 1, name: 'futuros' })).toBeInTheDocument()
    expect(screen.getByText('Tema')).toBeInTheDocument()
    expect(screen.getByText(/Escenarios, imaginarios/)).toBeInTheDocument()
    expect(screen.getByText('33 contenidos')).toBeInTheDocument()
  })

  it('has a bar to explore the topics that go with it and all the topics, with the current one marked', () => {
    render(<TopicHeader {...props} />)
    const nav = screen.getByRole('navigation', { name: 'Explorar' })
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('futuros')
    expect(screen.getByRole('link', { name: 'diseño' })).toHaveAttribute('href', '/tag/diseno')
    expect(screen.getByRole('link', { name: 'Todos los temas →' })).toHaveAttribute('href', '/topics')
  })

  it('shows its picture next to the title when it has one', () => {
    const { container } = render(<TopicHeader {...props} imageUrl="https://cdn/futuros.webp" />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn/futuros.webp')
  })

  it('without a picture the text sits on the brand lime, and without a sentence it shows none', () => {
    const { container } = render(<TopicHeader {...props} description={null} />)
    expect(container.querySelector('img')).toBeNull()
    expect((container.querySelector('header > div') as HTMLElement).style.background).toMatch(/rgb\(210, 254, 115\)|#d2fe73/i)
    expect(screen.queryByText(/Escenarios/)).not.toBeInTheDocument()
  })
})
