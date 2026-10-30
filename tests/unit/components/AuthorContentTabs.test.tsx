import { render, screen, within, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AuthorContentTabs } from '@/components/author/AuthorContentTabs'

const messages: Record<string, string> = {
  tabAll: 'Todo', tabEditorials: 'Editoriales', tabArticles: 'Artículos', tabVideos: 'Videos', tabPodcasts: 'Podcasts', tabPills: 'Píldoras', tabCourses: 'Cursos',
  sectionEditorials: 'Editoriales', sectionArticles: 'Artículos', sectionVideos: 'Videos', sectionPodcasts: 'Podcasts', sectionPills: 'Píldoras', sectionCourses: 'Cursos',
  featuredSection: 'Destacado', editorialKicker: 'Editorial', readEditorial: 'Leer el editorial', authorBadge: 'Autor', featuredBadge: 'Destacado',
  noContent: 'Aún no hay contenido', moreFrom: 'Más de {name}',
}
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => messages[key] ?? key }))
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...rest}>{children}</a>,
}))
vi.mock('@/components/social/LikeButton', () => ({ LikeButton: () => null }))
vi.mock('@/components/social/BookmarkButton', () => ({ BookmarkButton: () => null }))
vi.mock('@/lib/actions/author', () => ({ toggleAuthorFeatured: vi.fn() }))
vi.mock('@/components/content/CourseShowcase', () => ({
  CourseShowcase: ({ items }: { items: Array<{ slug: string; title: string }> }) => (
    <ul data-testid="courses">{items.map((i) => <li key={i.slug}>{i.title}</li>)}</ul>
  ),
}))

const base = {
  isFeatured: false, coverImageUrl: null, likesCount: 0, publishedAt: '2026-01-01T00:00:00Z', excerpt: null, description: null, tags: [],
  thumbnailUrl: null, duration: null, episodeNumber: null, podcastCoverUrl: null, accentColor: null, pillImageUrl: null,
}
const article = (n: number) => ({ ...base, id: `a${n}`, type: 'article', slug: `articulo-${n}`, title: `Artículo ${n}` })
const editorial = (n: number, month: string, issueDate: string) => ({
  ...base, id: `e${n}`, type: 'article', slug: `editorial-${n}`, title: `Editorial ${n}`, excerpt: `Texto ${n}`,
  isEditorial: true, issueDate, issueLabel: month,
})
const props = { authorName: 'Elsie Ralston', authorSlug: 'elsie-ralston', authorAvatarUrl: null, isLoggedIn: false }

// more than four items: the version with the tab bar
const many = [editorial(1, 'Octubre de 2025', '2025-10-01'), editorial(2, 'Noviembre de 2025', '2025-11-01'), article(1), article(2), article(3)]

describe('AuthorContentTabs: editorials of an author who is an editor', () => {
  it('has an "Editoriales" tab that counts them apart from the articles', () => {
    render(<AuthorContentTabs items={many} {...props} />)
    expect(screen.getByRole('button', { name: 'Editoriales (2)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Artículos (3)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Todo (5)' })).toBeInTheDocument()
  })

  it('shows an "Editoriales" section under "Todo", newest issue first, labelled with the issue month', () => {
    render(<AuthorContentTabs items={many} {...props} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Editoriales' })).toBeInTheDocument()
    const cards = screen.getAllByRole('article').filter((c) => within(c).queryByText(/^Editorial ·/))
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual(['Editorial 2', 'Editorial 1'])
    expect(screen.getByText('Editorial · Noviembre de 2025')).toBeInTheDocument()
    expect(within(cards[0]).getByRole('link', { name: /Leer el editorial/ })).toHaveAttribute('href', '/articles/editorial-2')
  })

  it('puts the editorials last, after the articles and the other content, in the page and in the tab bar', () => {
    const video = { ...base, id: 'v1', type: 'video', slug: 'video-1', title: 'Video 1' }
    render(<AuthorContentTabs items={[...many, video]} {...props} />)
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Artículos', 'Videos', 'Editoriales'])
    const tabs = screen.getAllByRole('button').map((b) => b.textContent)
    expect(tabs[tabs.length - 1]).toBe('Editoriales (2)')
  })

  it('also puts them last for an author with little content', () => {
    render(<AuthorContentTabs items={[editorial(1, 'Octubre de 2025', '2025-10-01'), article(1)]} {...props} />)
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Artículos', 'Editoriales'])
  })

  it('does not list the editorials among the articles', () => {
    render(<AuthorContentTabs items={many} {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Artículos (3)' }))
    expect(screen.queryByText('Editorial 1')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Editoriales' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Artículo 1' })).toBeInTheDocument()
  })

  it('the "Editoriales" tab shows only the editorials', () => {
    render(<AuthorContentTabs items={many} {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Editoriales (2)' }))
    expect(screen.getByText('Editorial 1')).toBeInTheDocument()
    expect(screen.queryByText('Artículo 1')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Artículos' })).not.toBeInTheDocument()
  })

  it('has no "Editoriales" tab or section for an author without editorials', () => {
    render(<AuthorContentTabs items={[article(1), article(2), article(3), article(4), article(5)]} {...props} />)
    expect(screen.queryByRole('button', { name: /Editoriales/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Editoriales' })).not.toBeInTheDocument()
  })

  it('also separates them for an author with little content', () => {
    render(<AuthorContentTabs items={[editorial(1, 'Octubre de 2025', '2025-10-01'), article(1)]} {...props} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Editoriales' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Artículos' })).toBeInTheDocument()
    expect(screen.getByText('Editorial · Octubre de 2025')).toBeInTheDocument()
  })
})

describe('courses on an author page', () => {
  const course = (n: number) => ({ ...base, id: `c${n}`, type: 'course', slug: `curso-${n}`, title: `Curso ${n}`, coursePrice: 100, courseCurrency: 'USD', courseDuration: '12 semanas' })

  it('shows the courses in their own tab and section, first on the "All" tab', () => {
    render(<AuthorContentTabs {...props} items={[course(1), article(1), article(2), article(3), article(4)]} />)
    expect(screen.getByRole('button', { name: 'Cursos (1)' })).toBeInTheDocument()
    expect(within(screen.getByTestId('courses')).getByText('Curso 1')).toBeInTheDocument()
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings.indexOf('Cursos')).toBeLessThan(headings.indexOf('Artículos'))
  })

  it('has no Courses tab when the author has no courses', () => {
    render(<AuthorContentTabs {...props} items={[article(1), article(2), article(3), article(4), article(5)]} />)
    expect(screen.queryByRole('button', { name: /Cursos/ })).not.toBeInTheDocument()
    expect(screen.queryByTestId('courses')).not.toBeInTheDocument()
  })
})

