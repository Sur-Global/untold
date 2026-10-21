import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ViewContentLink } from '@/components/content/ViewContentLink'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
// Same sidestep as the other component tests: next-intl's navigation needs a bare `next/navigation` import
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

describe('ViewContentLink', () => {
  it('opens the published page in a new tab, as its ↗ arrow promises', () => {
    render(<ViewContentLink type="pill" slug="mi-pildora" />)
    const link = screen.getByRole('link', { name: /viewMyPill/ })
    expect(link).toHaveAttribute('href', '/pills/mi-pildora')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('uses the right label and path for each content type', () => {
    const { rerender } = render(<ViewContentLink type="article" slug="a" />)
    expect(screen.getByRole('link', { name: /viewMyArticle/ })).toHaveAttribute('href', '/articles/a')
    rerender(<ViewContentLink type="video" slug="v" />)
    expect(screen.getByRole('link', { name: /viewMyVideo/ })).toHaveAttribute('href', '/videos/v')
  })
})
