import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
// Render <Script> as a marker so we can see whether Google would be loaded
vi.mock('next/script', () => ({
  default: ({ src, id }: { src?: string; id?: string }) => <i data-testid="script" data-src={src ?? id} />,
}))

import { CookieConsent } from '@/components/analytics/CookieConsent'

const clearCookies = () =>
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim()
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`
  })

describe('CookieConsent', () => {
  const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  beforeEach(() => {
    clearCookies()
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123456'
  })
  afterEach(() => {
    cleanup()
    if (original === undefined) delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    else process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original
  })

  it('shows nothing at all when analytics is not configured', () => {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    const { container } = render(<CookieConsent />)
    expect(container).toBeEmptyDOMElement()
  })

  it('asks first and loads nothing from Google before an answer', () => {
    render(<CookieConsent />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('script')).not.toBeInTheDocument()
  })

  it('accepting remembers the choice, closes the banner and loads Google Analytics', () => {
    render(<CookieConsent />)
    fireEvent.click(screen.getByText('accept'))
    expect(document.cookie).toContain('untold_cookie_consent=granted')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('script').some((s) => s.getAttribute('data-src')?.includes('G-TEST123456'))).toBe(true)
  })

  it('declining remembers the choice and never loads Google Analytics', () => {
    render(<CookieConsent />)
    fireEvent.click(screen.getByText('decline'))
    expect(document.cookie).toContain('untold_cookie_consent=denied')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByTestId('script')).not.toBeInTheDocument()
  })

  it('does not ask again once the visitor has answered', () => {
    document.cookie = 'untold_cookie_consent=denied; Path=/'
    render(<CookieConsent />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('the footer link reopens the banner', () => {
    document.cookie = 'untold_cookie_consent=granted; Path=/'
    render(<CookieConsent />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    window.dispatchEvent(new Event('untold:cookie-settings'))
    return screen.findByRole('dialog')
  })
})
