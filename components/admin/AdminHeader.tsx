'use client'

import Link from 'next/link'
import { signOut } from '@/lib/actions/auth'
import { LogOut } from 'lucide-react'

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-primary/10 bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-heading text-sm uppercase tracking-[0.2em] text-foreground transition-colors hover:text-primary"
          >
            UNTOLD
          </Link>
          <span className="hidden h-4 w-px bg-primary/15 sm:block" aria-hidden />
          <span className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground sm:inline">
            Admin dashboard
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View site
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/60"
            >
              <LogOut className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
