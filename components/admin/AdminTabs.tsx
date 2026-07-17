'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { LayoutDashboard, Globe, FileText, Users, BookOpen, Settings } from 'lucide-react'
import type { UserRole } from '@/lib/supabase/types'

const TABS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true, adminOnly: false },
  { href: '/admin/content', label: 'Content', icon: FileText, exact: false, adminOnly: false },
  { href: '/admin/translations', label: 'Translations', icon: Globe, exact: false, adminOnly: false },
  { href: '/admin/users', label: 'Users', icon: Users, exact: false, adminOnly: false },
  { href: '/admin/pages', label: 'Pages', icon: BookOpen, exact: false, adminOnly: true },
  { href: '/admin/settings', label: 'Settings', icon: Settings, exact: false, adminOnly: true },
] as const

function tabActive(pathname: string, href: string, exact: boolean) {
  if (exact) {
    return pathname === href || pathname === `${href}/`
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminTabs({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || role === 'admin')

  return (
    <nav
      className="border-b border-primary/10 bg-background"
      aria-label="Admin sections"
    >
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {visibleTabs.map(({ href, label, icon: Icon, exact }) => {
          const active = tabActive(pathname, href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors sm:px-4',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-primary/25 hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="h-4 w-4 opacity-80" aria-hidden />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
