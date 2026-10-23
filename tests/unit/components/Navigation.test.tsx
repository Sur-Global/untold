import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Navigation } from '@/components/layout/Navigation'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => 'en',
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}))
// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))
// LocaleSwitcher (rendered inside Navigation) pulls in next-intl's createNavigation,
// which does a bare `next/navigation` import that vitest can't resolve under this
// Next version — sidestep it entirely, same pattern used in ContentCard.test.tsx.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}))

describe('Navigation', () => {
  it('renders the UNTOLD logo', () => {
    render(<Navigation isLoggedIn={false} userRole={null} />)
    expect(screen.getByAltText('UNTOLD.ink')).toBeInTheDocument()
  })

  it('shows Login when logged out', () => {
    render(<Navigation isLoggedIn={false} userRole={null} />)
    expect(screen.getByText('nav.login')).toBeInTheDocument()
  })

  it('shows Dashboard and Create when logged in as creator', () => {
    render(<Navigation isLoggedIn={true} userRole="author" />)
    expect(screen.getByText('nav.dashboard')).toBeInTheDocument()
    expect(screen.getByText('nav.createContent')).toBeInTheDocument()
  })

  it('shows Dashboard and Create for a plain member, but not the admin link', () => {
    render(<Navigation isLoggedIn={true} userRole="user" />)
    expect(screen.getByText('nav.dashboard')).toBeInTheDocument()
    expect(screen.getByText('nav.createContent')).toBeInTheDocument()
    expect(screen.queryByText('nav.adminDashboard')).not.toBeInTheDocument()
  })

  it('shows neither for logged-out visitors', () => {
    render(<Navigation isLoggedIn={false} userRole={null} />)
    expect(screen.queryByText('nav.dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('nav.createContent')).not.toBeInTheDocument()
  })

  describe('"Explore" menu', () => {
    it('offers Creators and Issues above the topics', () => {
      render(<Navigation isLoggedIn={false} userRole={null} />)
      const creators = screen.getAllByRole('link', { name: 'nav.creators' })[0]
      const issues = screen.getAllByRole('link', { name: 'nav.issues' })[0]
      expect(creators).toHaveAttribute('href', '/creators')
      expect(issues).toHaveAttribute('href', '/issues')
    })

    it('opens with hover or keyboard focus, and its panel touches the button so it does not close on the way to an option', () => {
      const { container } = render(<Navigation isLoggedIn={false} userRole={null} />)
      const panel = container.querySelector('.group-hover\\:block') as HTMLElement
      expect(panel).not.toBeNull()
      expect(panel.className).toContain('group-focus-within:block')
      // no empty strip between the button and the visible menu: the wrapper starts right at the button
      expect(panel.style.top).toBe('100%')
      expect(panel.style.paddingTop).toBe('12px')
    })
  })
})
