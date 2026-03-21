'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Globe, FileText, Users } from 'lucide-react'

const NAV_LINKS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/translations', label: 'Translations', icon: Globe },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/users', label: 'Users', icon: Users },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-60 flex-col bg-neutral-900 text-white">
      <div className="border-b border-neutral-800 px-6 py-5">
        <span className="font-mono text-sm uppercase tracking-widest">UNTOLD</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/admin'
              ? pathname === '/admin' || pathname.endsWith('/admin')
              : pathname.includes(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-neutral-800 p-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          ← Back to site
        </Link>
      </div>
    </aside>
  )
}
