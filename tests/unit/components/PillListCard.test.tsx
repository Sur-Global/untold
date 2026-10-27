import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PillListCard } from '@/components/pills/PillListCard'
import type { PillSlide } from '@/lib/pill-slides'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))
vi.mock('next-intl', () => ({
  useLocale: () => 'es',
  useTranslations: () => (key: string) => key,
}))
vi.mock('@/lib/actions/social', () => ({ toggleBookmark: vi.fn() }))

const slide: PillSlide = { id: 's1', kind: 'photo', image_url: 'https://cdn/s1.webp', text: 'El mito del crecimiento', credit: '', text_x: 'left', text_y: 'top', text_size: 'xl', text_color: 'white', text_bg: 'lilac', brands: ['untold'], logo: 'auto', logo_color: 'white' }
const pill = {
  contentId: 'c1',
  slug: 'el-mito-del-crecimiento',
  title: 'El mito del crecimiento',
  excerpt: 'Para el PIB, un país va bien cuando produce y consume más.',
  coverImageUrl: 'https://cdn/s1.webp',
  coverSlide: slide,
  accentColor: '#A1A1E9',
  categoryTag: 'sostenibilidad',
  categoryTagSlug: 'sostenibilidad',
  authorName: 'Cristian Situ',
  authorSlug: 'cristian-situ',
  likesCount: 7,
}

describe('PillListCard', () => {
  it('puts the slide, whole and designed, on one side: the first thing in the card, 4:5, with the title over the photo', () => {
    const { container } = render(<PillListCard {...pill} />)
    const cover = container.querySelector('a[aria-label="El mito del crecimiento"]') as HTMLElement
    expect(cover.querySelector('[data-slide-kind="photo"]')).toBeInTheDocument()
    expect(cover.style.aspectRatio).toBe('4 / 5')
    expect(cover.className).toContain('sm:w-[42%]')
    expect(container.querySelector('article')!.className).toContain('sm:flex-row')
  })

  it('has the topic, the title, the summary, the author and the likes on the other', () => {
    render(<PillListCard {...pill} />)
    expect(screen.getByRole('link', { name: 'sostenibilidad' })).toHaveAttribute('href', '/tag/sostenibilidad')
    expect(screen.getByRole('heading', { name: 'El mito del crecimiento' })).toBeInTheDocument()
    expect(screen.getByText('Para el PIB, un país va bien cuando produce y consume más.')).toBeInTheDocument()
    for (const link of screen.getAllByRole('link', { name: 'Cristian Situ' })) expect(link).toHaveAttribute('href', '/author/cristian-situ')
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('has the save button, off for people who are not logged in', () => {
    render(<PillListCard {...pill} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('a text pill (no designed slide) shows its title over its picture instead', () => {
    const { container } = render(<PillListCard {...pill} coverSlide={null} />)
    expect(container.querySelector('[data-slide-kind]')).toBeNull()
    expect(container.querySelector('a[aria-label] img')).toHaveAttribute('src', 'https://cdn/s1.webp')
  })

  it('works without summary, topic and author', () => {
    render(<PillListCard {...pill} excerpt={null} categoryTag={null} authorName={null} />)
    expect(screen.queryByText(/Para el PIB/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'sostenibilidad' })).not.toBeInTheDocument()
    expect(screen.queryByText('Cristian Situ')).not.toBeInTheDocument()
  })
})
