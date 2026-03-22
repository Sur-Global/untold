'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  return (
    <header className="sticky top-0 z-50 border-b bg-[#F5F1E8]/95 backdrop-blur" style={{ borderColor: 'rgba(139,69,19,0.15)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="text-xl tracking-widest uppercase text-[#2C2420]" style={{ fontFamily: 'Audiowide, sans-serif' }}>
          UNTOLD
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {NAV_LINKS.map(({ key, href }) => (
            <Link key={key} href={href} className="hover:text-[#A0522D] transition-colors">
              {t(key)}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <LocaleSwitcher />

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-2">
            {isLoggedIn && isCreator(userRole) ? (
              <>
                <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
                  {t('dashboard')}
                </Button>
                <Button size="sm" className="gradient-rust text-white border-0" render={<Link href="/create" />}>
                  {t('createContent')}
                </Button>
              </>
            ) : !isLoggedIn ? (
              <>
                <Button variant="ghost" size="sm" render={<Link href="/auth/login" />}>
                  {t('login')}
                </Button>
                <Button size="sm" className="gradient-rust text-white border-0" render={<Link href="/auth/signup" />}>
                  {t('signup')}
                </Button>
              </>
            ) : null}
          </div>

          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-lg p-1.5 hover:bg-muted transition-colors" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#F5F1E8] w-72">
              <nav className="flex flex-col gap-4 mt-8" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {NAV_LINKS.map(({ key, href }) => (
                  <Link key={key} href={href} className="text-base hover:text-[#A0522D] transition-colors py-2 border-b" style={{ borderColor: 'rgba(139,69,19,0.1)' }}>
                    {t(key)}
                  </Link>
                ))}
                <div className="flex flex-col gap-2 mt-4">
                  {isLoggedIn && isCreator(userRole) ? (
                    <>
                      <Button variant="ghost" className="justify-start" render={<Link href="/dashboard" />}>
                        {t('dashboard')}
                      </Button>
                      <Button className="gradient-rust text-white border-0" render={<Link href="/create" />}>
                        {t('createContent')}
                      </Button>
                    </>
                  ) : !isLoggedIn ? (
                    <>
                      <Button variant="ghost" className="justify-start" render={<Link href="/auth/login" />}>
                        {t('login')}
                      </Button>
                      <Button className="gradient-rust text-white border-0" render={<Link href="/auth/signup" />}>
                        {t('signup')}
                      </Button>
                    </>
                  ) : null}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
