import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const nav: Record<string, string> = {
  articles: 'Artículos', videos: 'Videos', podcasts: 'Podcasts', pills: 'Píldoras', courses: 'Cursos', issues: 'Números', creators: 'Creadores',
}
const footer: Record<string, string> = { contentHeading: 'Contenido', topicsHeading: 'Temas', pagesHeading: 'Páginas', brandTagline: 'x', subscribeCta: 'Suscríbete' }

vi.mock('next-intl/server', () => ({
  getLocale: async () => 'es',
  getTranslations: async (ns: string) => (key: string) => (ns === 'nav' ? nav[key] : footer[key]) ?? key,
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }))
vi.mock('@/lib/data/static-pages', () => ({ getStaticPagesForFooter: vi.fn() }))
vi.mock('@/lib/data/trending-topics', () => ({
  getTrendingTopics: async () => [{ slug: 'decolonizacion', label: 'Decolonización' }, { slug: 'futuros', label: 'Futuros' }],
}))
vi.mock('@/lib/sender', () => ({ isSenderConfigured: () => false }))
vi.mock('@/components/analytics/CookieSettingsButton', () => ({ CookieSettingsButton: () => null }))
vi.mock('@/components/layout/SubscribeModalButton', () => ({ SubscribeModalButton: () => null }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...rest}>{children}</a>,
}))

import { Footer } from '@/components/layout/Footer'
import { getStaticPagesForFooter } from '@/lib/data/static-pages'

const column = (heading: string) => screen.getByText(heading).parentElement as HTMLElement
const labels = (el: HTMLElement) => within(el).getAllByRole('link').map((a) => a.textContent)

describe('Footer', () => {
  beforeEach(() => {
    vi.mocked(getStaticPagesForFooter).mockResolvedValue([
      { slug: 'politica-de-privacidad', title: 'Política de privacidad' },
      { slug: 'about', title: 'Sobre UNTOLD' },
    ] as any)
  })

  it('lists the issues under Content, in alphabetical order with the other kinds of content', async () => {
    render(await Footer())
    expect(labels(column('Contenido'))).toEqual(['Artículos', 'Cursos', 'Números', 'Píldoras', 'Podcasts', 'Videos'])
    expect(within(column('Contenido')).getByRole('link', { name: 'Números' })).toHaveAttribute('href', '/issues')
  })

  it('lists the creators under Pages, in alphabetical order with the static pages', async () => {
    render(await Footer())
    expect(labels(column('Páginas'))).toEqual(['Creadores', 'Política de privacidad', 'Sobre UNTOLD'])
    expect(within(column('Páginas')).getByRole('link', { name: 'Creadores' })).toHaveAttribute('href', '/creators')
  })

  it('has no separate Community block, and still shows Pages when there are no static pages', async () => {
    vi.mocked(getStaticPagesForFooter).mockResolvedValue([])
    render(await Footer())
    expect(screen.queryByText('community')).not.toBeInTheDocument()
    expect(labels(column('Páginas'))).toEqual(['Creadores'])
  })

  it('lists the most trending topics, linked to their pages', async () => {
    render(await Footer())
    const topics = column('Temas')
    expect(labels(topics)).toEqual(['Decolonización', 'Futuros'])
    expect(within(topics).getByRole('link', { name: 'Decolonización' })).toHaveAttribute('href', '/tag/decolonizacion')
    expect(screen.queryByText('Descolonialidad')).not.toBeInTheDocument()
  })
})
