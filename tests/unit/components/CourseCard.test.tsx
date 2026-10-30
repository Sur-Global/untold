import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import es from '@/messages/es.json'

const content = es.content as Record<string, string>

vi.mock('next-intl', () => ({
  useLocale: () => 'es',
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    (content[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => values?.[name] ?? ''),
}))
vi.mock('@/i18n/navigation', () => ({ Link: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }))
vi.mock('@/components/social/BookmarkButton', () => ({ BookmarkButton: ({ contentId }: { contentId: string }) => <button data-testid="bookmark" data-id={contentId}>Guardar</button> }))

import { CourseCard, type CourseCardProps } from '@/components/content/CourseCard'
import { CourseShowcase } from '@/components/content/CourseShowcase'

const course: CourseCardProps = {
  slug: 'las-esferas',
  title: 'Las Esferas de la Innovación',
  excerpt: 'Cuatro esferas para rediseñar tu oficio.',
  coverImageUrl: 'https://img.example/banner.webp',
  price: 1160,
  currency: 'USD',
  duration: '12 semanas - Clases en vivo sábados 10:00 - 12:00',
  authorName: 'Escuela Breve de Sur Global',
  authorSlug: 'sur-global',
}

const pictureLink = (container: HTMLElement) => container.querySelector('article > a') as HTMLAnchorElement

describe('CourseCard, the banner', () => {
  it('is shown whole in a 16:9 frame, with nothing laid over it', () => {
    const { container } = render(<CourseCard {...course} />)
    const link = pictureLink(container)
    expect(link).toHaveStyle({ aspectRatio: '16 / 9' })
    expect(link.children).toHaveLength(1)
    expect(link.firstElementChild!.tagName).toBe('IMG')
    expect(link.firstElementChild).toHaveAttribute('src', course.coverImageUrl!)
  })

  it('the price is not on the banner: it is in the body, with the facts', () => {
    const { container } = render(<CourseCard {...course} />)
    const link = pictureLink(container)
    const price = screen.getByText(/1160/)
    expect(price).toHaveTextContent('USD')
    expect(link.contains(price)).toBe(false)
    expect(screen.getByText(/12 semanas/)).toBeInTheDocument()
  })

  it('with a banner that already has the title the card does not repeat it, but screen readers still get it', () => {
    const { container } = render(<CourseCard {...course} bannerHasTitle />)
    const heading = screen.getByRole('heading', { name: course.title })
    expect(heading).toHaveClass('sr-only')
    expect(within(heading).queryByRole('link')).toBeNull()
    const link = pictureLink(container)
    expect(link).toHaveAttribute('aria-label', course.title)
    expect(link).not.toHaveAttribute('tabindex')
  })

  it('otherwise the title is a visible link, and the picture link is left out of the reading and tab order', () => {
    const { container } = render(<CourseCard {...course} />)
    const heading = screen.getByRole('heading', { name: course.title })
    expect(heading).not.toHaveClass('sr-only')
    expect(within(heading).getByRole('link')).toHaveAttribute('href', '/courses/las-esferas')
    const link = pictureLink(container)
    expect(link).toHaveAttribute('aria-hidden', 'true')
    expect(link).toHaveAttribute('tabindex', '-1')
  })

  it('without a banner the frame is a brand-lime block that carries the title', () => {
    const { container } = render(<CourseCard {...course} coverImageUrl={null} />)
    const link = pictureLink(container)
    expect(container.querySelector('img')).toBeNull()
    expect(link).toHaveTextContent(course.title)
    expect(link.firstElementChild).toHaveStyle({ background: '#D2FE73' })
    expect(screen.getByRole('heading', { name: course.title })).toHaveClass('sr-only')
    expect(link).toHaveAttribute('aria-label', course.title)
  })
})

describe('CourseCard, the details', () => {
  it('shows "Gratis" for a free course and no price at all when there is none', () => {
    const { unmount } = render(<CourseCard {...course} price={0} />)
    expect(screen.getByText('Gratis')).toBeInTheDocument()
    unmount()
    render(<CourseCard {...course} price={null} />)
    expect(screen.queryByText(/USD|Gratis/)).toBeNull()
  })

  it('shows students only when there are some, and the rating when there is one', () => {
    const { unmount } = render(<CourseCard {...course} studentsCount={0} rating={null} />)
    expect(screen.queryByText('0')).toBeNull()
    expect(screen.queryByText(/★/)).toBeNull()
    unmount()
    render(<CourseCard {...course} studentsCount={1200} rating={4.75} />)
    expect(screen.getByText(/1200|1\.200/)).toBeInTheDocument()
    expect(screen.getByText('★ 4.8')).toBeInTheDocument()
  })

  it('says when the course is only in one language, and links its topic', () => {
    render(<CourseCard {...course} singleLanguage sourceLocale="es" topic={{ label: 'Futuros', slug: 'futuros' }} />)
    expect(screen.getByText(/Solo en/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Futuros' })).toHaveAttribute('href', '/tag/futuros')
  })

  it('has the like count and the bookmark only where the page asks for them', () => {
    const { unmount } = render(<CourseCard {...course} />)
    expect(screen.queryByTestId('bookmark')).toBeNull()
    unmount()
    render(<CourseCard {...course} bookmark={{ contentId: 'c-1', likesCount: 7, isBookmarked: false, isLoggedIn: true }} />)
    expect(screen.getByTestId('bookmark')).toHaveAttribute('data-id', 'c-1')
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('the wide card has a button to the course; the small one does not', () => {
    const { unmount } = render(<CourseCard {...course} variant="wide" />)
    expect(screen.getByRole('link', { name: 'Ver el curso' })).toHaveAttribute('href', '/courses/las-esferas')
    unmount()
    render(<CourseCard {...course} />)
    expect(screen.queryByRole('link', { name: 'Ver el curso' })).toBeNull()
  })
})

describe('CourseShowcase, one, two or three courses', () => {
  const many = (n: number): CourseCardProps[] => Array.from({ length: n }, (_, i) => ({ ...course, slug: `curso-${i}`, title: `Curso ${i}` }))

  it('renders nothing without courses', () => {
    const { container } = render(<CourseShowcase items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('one course: a single wide card across the row, not a card in a grid', () => {
    const { container } = render(<CourseShowcase items={many(1)} />)
    expect(container.querySelectorAll('article')).toHaveLength(1)
    expect(container.querySelector('.grid.gap-5')).toBeNull()
    expect(container.querySelector('article')!.className).toContain('lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]')
    expect(screen.getByRole('link', { name: 'Ver el curso' })).toBeInTheDocument()
  })

  it('two courses: two equal columns, with no empty third', () => {
    const { container } = render(<CourseShowcase items={many(2)} />)
    const grid = container.querySelector('.grid') as HTMLElement
    expect(grid.className).toContain('sm:grid-cols-2')
    expect(grid.className).not.toContain('lg:grid-cols-3')
    expect(container.querySelectorAll('article')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Ver el curso' })).toBeNull()
  })

  it('three courses: three columns', () => {
    const { container } = render(<CourseShowcase items={many(3)} />)
    expect((container.querySelector('.grid') as HTMLElement).className).toContain('lg:grid-cols-3')
    expect(container.querySelectorAll('article')).toHaveLength(3)
  })
})
