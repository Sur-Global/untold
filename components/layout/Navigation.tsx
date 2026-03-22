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

export function Navigation({ isLoggedIn, userRole }: NavigationProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: '#2c2420', boxShadow: '0 2px 8px rgba(44,36,32,0.08)' }}
    >
      {/* Row 1: Logo left, nav links right */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between" style={{ height: 80 }}>
        <Link
          href="/"
          className="shrink-0"
          style={{
            fontFamily: 'Audiowide, sans-serif',
            fontSize: 22,
            letterSpacing: 3,
            color: '#F5F1E8',
            textDecoration: 'none',
          }}
        >
          UNTOLD
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ key, href }) => {
            const active = pathname.startsWith(`/${href.slice(1)}`) || pathname.includes(href)
            return (
              <Link
                key={key}
                href={href}
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 14,
                  color: '#fff',
                  textDecoration: 'none',
                  paddingBottom: 2,
                  borderBottom: active
                    ? '2px solid #a0522d'
                    : '2px solid transparent',
                  opacity: active ? 1 : 0.85,
                  transition: 'opacity 0.15s',
                }}
              >
                {t(key)}
              </Link>
            )
          })}
        </nav>

        {/* Mobile hamburger */}
        <Sheet>
          <SheetTrigger
            className="md:hidden inline-flex items-center justify-center rounded-lg p-1.5 transition-colors"
            style={{ color: '#F5F1E8' }}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right" style={{ background: '#2c2420', width: 288 }}>
            <nav className="flex flex-col gap-4 mt-8" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {NAV_LINKS.map(({ key, href }) => (
                <Link
                  key={key}
                  href={href}
                  className="py-2 text-base transition-opacity"
                  style={{
                    color: '#F5F1E8',
                    textDecoration: 'none',
                    borderBottom: '1px solid rgba(139,69,19,0.15)',
                  }}
                >
                  {t(key)}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4">
                <LocaleSwitcher />
                {isLoggedIn && isCreator(userRole) ? (
                  <>
                    <Link href="/dashboard" style={{ color: '#F5F1E8', fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>
                      {t('dashboard')}
                    </Link>
                    <Link href="/create" style={{ color: '#F5F1E8', fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>
                      {t('createContent')}
                    </Link>
                  </>
                ) : !isLoggedIn ? (
                  <>
                    <Link href="/auth/login" style={{ color: '#F5F1E8', fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>
                      {t('login')}
                    </Link>
                    <Link href="/auth/signup" style={{ color: '#F5F1E8', fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}>
                      {t('signup')}
                    </Link>
                  </>
                ) : null}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      {/* Row 2: Locale + auth, right-aligned */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 hidden md:flex items-center justify-end gap-3"
        style={{
          height: 66,
          borderTop: '1px solid rgba(139,69,19,0.1)',
        }}
      >
        <LocaleSwitcher />

        {isLoggedIn && isCreator(userRole) ? (
          <>
            <Link
              href="/dashboard"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14,
                color: '#F5F1E8',
                border: '1px solid rgba(245,241,232,0.3)',
                borderRadius: 10,
                padding: '8px 16px',
                textDecoration: 'none',
              }}
            >
              {t('dashboard')}
            </Link>
            <Link
              href="/create"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14,
                color: '#fff',
                background: 'linear-gradient(160deg,#8b4513,#a0522d)',
                borderRadius: 10,
                padding: '8px 20px',
                textDecoration: 'none',
              }}
            >
              {t('createContent')}
            </Link>
          </>
        ) : !isLoggedIn ? (
          <>
            <Link
              href="/auth/login"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14,
                color: '#F5F1E8',
                textDecoration: 'none',
                padding: '8px 16px',
              }}
            >
              {t('login')}
            </Link>
            <Link
              href="/auth/signup"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 14,
                color: '#fff',
                background: 'linear-gradient(160deg,#8b4513,#a0522d)',
                borderRadius: 10,
                padding: '8px 20px',
                textDecoration: 'none',
              }}
            >
              {t('signup')}
            </Link>
          </>
        ) : (
          /* Logged-in reader: locale pill only (no buttons) */
          null
        )}
      </div>
    </header>
  )
}
