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

interface NavigationProps {
  isLoggedIn: boolean
  userRole: UserRole | null
}

const NAV_LINKS = [
  { key: 'articles' as const, href: '/articles' },
  { key: 'videos' as const, href: '/videos' },
  { key: 'podcasts' as const, href: '/podcasts' },
  { key: 'pills' as const, href: '/pills' },
  { key: 'courses' as const, href: '/courses' },
]

function isCreator(role: UserRole | null) {
  return role === 'admin' || role === 'author'
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const ghostLink: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12,
  color: 'rgba(245,241,232,0.7)',
  textDecoration: 'none',
  letterSpacing: '0.03em',
  transition: 'color 0.15s',
}

const divider = (
  <span style={{ color: 'rgba(245,241,232,0.2)', fontSize: 12, userSelect: 'none' }}>|</span>
)

export function Navigation({ isLoggedIn, userRole }: NavigationProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(32, 25, 22, 0.93)',
        backdropFilter: 'blur(12px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
        borderBottom: '1px solid rgba(139,69,19,0.18)',
        boxShadow: '0px 2px 16px rgba(44,36,32,0.18)',
      }}
    >
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6"
        style={{ height: 64 }}
      >
        {/* Logo */}
        <Link
          href="/"
          className="shrink-0"
          style={{
            fontFamily: 'Audiowide, sans-serif',
            fontSize: 20,
            letterSpacing: 3,
            color: '#F5F1E8',
            textDecoration: 'none',
          }}
        >
          UNTOLD
        </Link>

        {/* Desktop: nav links (centered, flex-1) */}
        <nav className="hidden md:flex items-center gap-5 flex-1 justify-center">
          {NAV_LINKS.map(({ key, href }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={key}
                href={href}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 13,
                  color: '#fff',
                  textDecoration: 'none',
                  paddingBottom: 2,
                  borderBottom: active ? '2px solid #a0522d' : '2px solid transparent',
                  opacity: active ? 1 : 0.8,
                  transition: 'opacity 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {t(key)}
              </Link>
            )
          })}
        </nav>

        {/* Desktop: search + auth (right-aligned) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {/* Search */}
          <Link
            href="/search"
            aria-label={t('search')}
            className="flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            style={{ width: 32, height: 32, color: 'rgba(245,241,232,0.7)' }}
          >
            <SearchIcon />
          </Link>

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
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  color: '#fff',
                  background: 'linear-gradient(135deg,#8b4513,#a0522d)',
                  borderRadius: 8,
                  padding: '5px 14px',
                  textDecoration: 'none',
                  letterSpacing: '0.03em',
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
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  color: '#fff',
                  background: 'linear-gradient(135deg,#8b4513,#a0522d)',
                  borderRadius: 8,
                  padding: '5px 14px',
                  textDecoration: 'none',
                  letterSpacing: '0.03em',
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
              style={{ color: '#F5F1E8' }}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" style={{ background: '#2c2420', width: 288 }}>
              <nav className="flex flex-col gap-1 mt-8" style={{ fontFamily: 'Inter, sans-serif' }}>
                {NAV_LINKS.map(({ key, href }) => (
                  <Link
                    key={key}
                    href={href}
                    className="py-3 text-sm transition-opacity hover:opacity-70"
                    style={{
                      color: '#F5F1E8',
                      textDecoration: 'none',
                      borderBottom: '1px solid rgba(139,69,19,0.15)',
                    }}
                  >
                    {t(key)}
                  </Link>
                ))}
                <Link
                  href="/search"
                  className="py-3 text-sm transition-opacity hover:opacity-70"
                  style={{ color: '#F5F1E8', textDecoration: 'none', borderBottom: '1px solid rgba(139,69,19,0.15)' }}
                >
                  {t('search')}
                </Link>

                <div className="flex flex-col gap-3 pt-5">
                  <LocaleSwitcher />
                  {isLoggedIn && isCreator(userRole) ? (
                    <>
                      <Link href="/dashboard" style={{ color: '#F5F1E8', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
                        {t('dashboard')}
                      </Link>
                      <Link
                        href="/create"
                        className="inline-flex items-center justify-center h-[36px] rounded-lg text-sm text-white"
                        style={{ background: 'linear-gradient(135deg,#8b4513,#a0522d)', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
                      >
                        {t('createContent')}
                      </Link>
                      <form action={signOut}>
                        <button type="submit" style={{ color: 'rgba(245,241,232,0.6)', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {t('logout')}
                        </button>
                      </form>
                    </>
                  ) : isLoggedIn ? (
                    <form action={signOut}>
                      <button type="submit" style={{ color: 'rgba(245,241,232,0.6)', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {t('logout')}
                      </button>
                    </form>
                  ) : (
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center justify-center h-[36px] rounded-lg text-sm text-white"
                      style={{ background: 'linear-gradient(135deg,#8b4513,#a0522d)', fontFamily: 'JetBrains Mono, monospace' }}
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
