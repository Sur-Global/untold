import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RelatedSection } from '@/components/content/RelatedContent'
import type { RelatedItem } from '@/lib/data/related-content'

vi.mock('@/components/content/ContentCard', () => ({
  ContentCard: ({ title, isLoggedIn }: { title: string; isLoggedIn: boolean }) => <article data-logged={String(isLoggedIn)}>{title}</article>,
}))
vi.mock('next-intl/server', () => ({ getTranslations: async () => (k: string) => k }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }))

const item = (n: number): RelatedItem => ({
  contentId: `c${n}`, type: 'article', slug: `a-${n}`, title: `Artículo ${n}`, likesCount: 0, isBookmarked: false, isFeatured: false, singleLanguage: false,
})

describe('RelatedSection', () => {
  it('shows the subtitle and one card per suggestion', () => {
    render(<RelatedSection title="También te puede interesar" items={[item(1), item(2), item(3)]} isLoggedIn />)
    expect(screen.getByRole('heading', { level: 2, name: 'También te puede interesar' })).toBeInTheDocument()
    expect(screen.getAllByRole('article').map((a) => a.textContent)).toEqual(['Artículo 1', 'Artículo 2', 'Artículo 3'])
    expect(screen.getAllByRole('article')[0]).toHaveAttribute('data-logged', 'true')
  })

  it('shows nothing, not even the subtitle, when there is nothing to suggest', () => {
    const { container } = render(<RelatedSection title="También te puede interesar" items={[]} isLoggedIn={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})
