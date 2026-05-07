import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Navigation } from '@/components/layout/Navigation'

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => 'en',
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))
// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('Navigation', () => {
  it('renders the UNTOLD logo', () => {
    render(<Navigation isLoggedIn={false} userRole={null} />)
    expect(screen.getByText('UNTOLD')).toBeInTheDocument()
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

  it('does not show Dashboard or Create for reader role', () => {
    render(<Navigation isLoggedIn={true} userRole="user" />)
    expect(screen.queryByText('nav.dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('nav.createContent')).not.toBeInTheDocument()
  })
})
