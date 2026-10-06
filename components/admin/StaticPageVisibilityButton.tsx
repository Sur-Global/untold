'use client'

import { useState, useTransition } from 'react'
import { setStaticPageStatus } from '@/lib/actions/static-page'
import { adminGhostButton } from './admin-ui'

/** Hide a page from the public site (keeps it as a draft) or make it visible again. */
export function StaticPageVisibilityButton({ pageId, status }: { pageId: string; status: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isVisible = status === 'published'

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            try {
              await setStaticPageStatus(pageId, isVisible ? 'draft' : 'published')
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not update the page')
            }
          })
        }}
        className={`${adminGhostButton} h-8 px-3 py-0 text-xs disabled:opacity-50`}
      >
        {pending ? '…' : isVisible ? 'Hide page' : 'Show page'}
      </button>
      {error && <span className="text-xs text-[#991b1b]">{error}</span>}
    </span>
  )
}
