'use client'

import { useId, useState, useSyncExternalStore } from 'react'

/**
 * A titled panel whose long explanation can be shown or hidden. The title and a one-line summary stay
 * visible; the choice is remembered in this browser (and the panel works without storage).
 */
export function CollapsiblePanel({
  storageKey,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  storageKey: string
  title: string
  /** a short line that stays visible while the details are hidden */
  summary?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const bodyId = useId()
  // What this browser remembers (nothing on the server or when storage is blocked); the choice made on the page wins
  const saved = useSyncExternalStore(
    (notify) => {
      window.addEventListener('storage', notify)
      return () => window.removeEventListener('storage', notify)
    },
    () => {
      try {
        return window.localStorage.getItem(storageKey)
      } catch {
        return null
      }
    },
    () => null,
  )
  const [choice, setChoice] = useState<boolean | null>(null)
  const open = choice ?? (saved === 'open' ? true : saved === 'closed' ? false : defaultOpen)

  const toggle = () => {
    const next = !open
    setChoice(next)
    try {
      window.localStorage.setItem(storageKey, next ? 'open' : 'closed')
    } catch {
      // not remembered, still toggles
    }
  }

  return (
    <div className="rounded-xl border border-primary/15 bg-card px-5 py-4 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{title}</p>
          {!open && summary && <p className="mt-0.5 text-xs text-muted-foreground">{summary}</p>}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="shrink-0 rounded-md border border-primary/20 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          {open ? 'Hide details' : 'Show details'}
        </button>
      </div>
      <div id={bodyId} hidden={!open}>
        {children}
      </div>
    </div>
  )
}
