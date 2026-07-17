'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { LocaleSwitcher } from './LocaleSwitcher'
import { signOut } from '@/lib/actions/auth'
import type { UserRole } from '@/lib/supabase/types'
import type { CmsNavLink } from '@/lib/platform-settings/types'

const FEATURED_TOPIC_SLUGS = [
  'decoloniality',
  'sustainability',
  'technology',
  'education',
  'responsible-ai',
] as const

interface NavigationProps {
  isLoggedIn: boolean
  userRole: UserRole | null
  /** From platform settings; when empty, default type-based links + translations are used */
  cmsNavItems?: CmsNavLink[]
  showSearchInHeader?: boolean
}

const NAV_LINKS = [
  { key: 'articles' as const, href: '/articles' },
  { key: 'videos' as const, href: '/videos' },
  { key: 'podcasts' as const, href: '/podcasts' },
  { key: 'pills' as const, href: '/pills' },
  { key: 'courses' as const, href: '/courses' },
]

function isCreator(role: UserRole | null) {
  return role === 'admin' || role === 'author' || role === 'editor'
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const navLinkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  fontWeight: 500,
}

const ghostLink: React.CSSProperties = {
  ...navLinkStyle,
  fontSize: 12,
  color: 'rgba(255,255,255,0.5)',
  textDecoration: 'none',
  letterSpacing: '0.02em',
  transition: 'color 0.15s',
}

const divider = (
  <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 12, userSelect: 'none' }}>|</span>
)

export function Navigation({
  isLoggedIn,
  userRole,
  cmsNavItems = [],
  showSearchInHeader = true,
}: NavigationProps) {
  const t = useTranslations('nav')
  const tFooter = useTranslations('footer')
  const pathname = usePathname()
  const useCmsNav = cmsNavItems.length > 0

  const topicLinks = FEATURED_TOPIC_SLUGS.map((slug) => {
    const key = slug === 'decoloniality' ? 'topicDecoloniality'
      : slug === 'sustainability' ? 'topicSustainability'
      : slug === 'technology' ? 'topicTechnology'
      : slug === 'education' ? 'topicEducation'
      : 'topicResponsibleAI'
    return { slug, label: tFooter(key as any) }
  })

  function linkActive(href: string) {
    if (href === '/') return pathname === '/' || pathname === ''
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(0,0,0,0.96)',
        backdropFilter: 'blur(16px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.8)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0px 1px 24px rgba(0,0,0,0.3)',
      }}
    >
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6"
        style={{ height: 64 }}
      >
        {/* Logo */}
        <Link href="/" className="shrink-0" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img
            src="/logo-untold.png"
            alt="UNTOLD.ink"
            style={{ height: 20, width: 'auto' }}
          />
        </Link>

        {/* Desktop: nav links (centered, flex-1) */}
        <nav className="hidden md:flex items-center gap-5 flex-1 justify-center">
          {useCmsNav
            ? cmsNavItems.map(({ label, href }) => {
                const active = linkActive(href)
                return (
                  <Link
                    key={`${href}-${label}`}
                    href={href}
                    style={{
                      ...navLinkStyle,
                      fontSize: 13,
                      color: active ? '#A9A8E9' : 'rgba(255,255,255,0.7)',
                      textDecoration: 'none',
                      paddingBottom: 2,
                      borderBottom: active ? '2px solid #A9A8E9' : '2px solid transparent',
                      transition: 'color 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </Link>
                )
              })
            : NAV_LINKS.map(({ key, href }) => {
                const active = pathname.startsWith(href)
                return (
                  <Link
                    key={key}
                    href={href}
                    style={{
                      ...navLinkStyle,
                      fontSize: 13,
                      color: active ? '#A9A8E9' : 'rgba(255,255,255,0.7)',
                      textDecoration: 'none',
                      paddingBottom: 2,
                      borderBottom: active ? '2px solid #A9A8E9' : '2px solid transparent',
                      transition: 'color 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t(key)}
                  </Link>
                )
              })}

          {/* Topics dropdown */}
          <div className="relative group">
            <button
              style={{
                ...navLinkStyle,
                fontSize: 13,
                color: 'rgba(255,255,255,0.7)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                paddingBottom: 2,
                borderBottom: '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {t('topics')}
              <svg width="9" height="5" viewBox="0 0 9 5" fill="currentColor" aria-hidden>
                <path d="M0 0l4.5 5L9 0H0z" />
              </svg>
            </button>
            <div
              className="absolute hidden group-hover:flex flex-col"
              style={{
                top: 'calc(100% + 12px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(8,8,8,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '6px 0',
                minWidth: 200,
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                zIndex: 200,
              }}
            >
              {topicLinks.map(({ slug, label }) => (
                <Link
                  key={slug}
                  href={`/tag/${slug}`}
                  className="block hover:text-[#A9A8E9] transition-colors"
                  style={{
                    fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.65)',
                    textDecoration: 'none',
                    padding: '9px 20px',
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Desktop: search + auth (right-aligned) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {showSearchInHeader && (
            <Link
              href="/search"
              aria-label={t('search')}
              className="flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
              style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.5)' }}
            >
              <SearchIcon />
            </Link>
          )}

          {/* Locale + auth zone */}
          <LocaleSwitcher variant="compact" />

          {isLoggedIn && isCreator(userRole) ? (
            <div className="flex items-center gap-2.5">
              {divider}
              <Link href="/dashboard" style={ghostLink}>{t('dashboard')}</Link>
              {divider}
              <Link
                href="/create"
                className="inline-flex items-center justify-center transition-opacity hover:opacity-90"
                style={{
                  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#000',
                  background: '#A9A8E9',
                  borderRadius: 100,
                  padding: '6px 16px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('createContent')}
              </Link>
              {divider}
              <form action={signOut} style={{ display: 'contents' }}>
                <button type="submit" style={{ ...ghostLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {t('logout')}
                </button>
              </form>
            </div>
          ) : isLoggedIn ? (
            <div className="flex items-center gap-2.5">
              {divider}
              <form action={signOut} style={{ display: 'contents' }}>
                <button type="submit" style={{ ...ghostLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {t('logout')}
                </button>
              </form>
            </div>
          ) : (
            <>
              {divider}
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center transition-opacity hover:opacity-90"
                style={{
                  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#000',
                  background: '#A9A8E9',
                  borderRadius: 100,
                  padding: '6px 16px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('login')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden ml-auto">
          <Sheet>
            <SheetTrigger
              className="inline-flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-white/10"
              style={{ color: '#FFFFFF' }}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" style={{ background: '#000', width: 288, padding: '0' }}>
              <nav className="flex flex-col h-full px-6 pt-14 pb-8" style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}>
                <div className="flex flex-col gap-1 flex-1">
                  {useCmsNav
                    ? cmsNavItems.map(({ label, href }) => (
                        <Link
                          key={`${href}-${label}`}
                          href={href}
                          className="py-3.5 text-sm transition-opacity hover:opacity-70"
                          style={{
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          {label}
                        </Link>
                      ))
                    : NAV_LINKS.map(({ key, href }) => (
                        <Link
                          key={key}
                          href={href}
                          className="py-3.5 text-sm transition-opacity hover:opacity-70"
                          style={{
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          {t(key)}
                        </Link>
                      ))}
                  {showSearchInHeader && (
                    <Link
                      href="/search"
                      className="py-3.5 text-sm transition-opacity hover:opacity-70"
                      style={{
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {t('search')}
                    </Link>
                  )}
                  {/* Topics section */}
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', paddingBottom: 6 }}>
                      {t('topics')}
                    </p>
                    {topicLinks.map(({ slug, label }) => (
                      <Link
                        key={slug}
                        href={`/tag/${slug}`}
                        className="py-2.5 text-sm transition-opacity hover:opacity-70"
                        style={{
                          color: 'rgba(255,255,255,0.6)',
                          textDecoration: 'none',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          display: 'block',
                          fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                        }}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-6">
                  <LocaleSwitcher />
                  {isLoggedIn && isCreator(userRole) ? (
                    <>
                      <Link href="/dashboard" style={{ color: '#FFFFFF', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontSize: 13 }}>
                        {t('dashboard')}
                      </Link>
                      <Link
                        href="/create"
                        className="inline-flex items-center justify-center h-[42px] rounded-full text-sm"
                        style={{ background: '#A9A8E9', color: '#000', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontSize: 13, fontWeight: 600 }}
                      >
                        {t('createContent')}
                      </Link>
                      <form action={signOut}>
                        <button type="submit" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {t('logout')}
                        </button>
                      </form>
                    </>
                  ) : isLoggedIn ? (
                    <form action={signOut}>
                      <button type="submit" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {t('logout')}
                      </button>
                    </form>
                  ) : (
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center justify-center h-[42px] rounded-full text-sm"
                      style={{ background: '#A9A8E9', color: '#000', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 600 }}
                    >
                      {t('login')}
                    </Link>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
