'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resolveFeatureRequest, type RequestDecision } from '@/lib/actions/feature-requests'
import { Button } from '@/components/ui/button'

const ACTIONS: Array<{ decision: RequestDecision; label: string; title: string }> = [
  { decision: 'page', label: '★ Its page', title: 'Feature at the top of its own page (Podcasts, Videos…)' },
  { decision: 'home', label: '⌂ Homepage', title: 'Show in its section on the homepage' },
  { decision: 'hero', label: '↑ Hero', title: 'Put in the homepage hero banner' },
  { decision: 'approve', label: 'Approve', title: 'Show on the general pages (listings, search, tags) without featuring it' },
  { decision: 'dismiss', label: 'Dismiss', title: 'Close the request without changing anything' },
]

export function FeatureRequestActions({ contentId }: { contentId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (decision: RequestDecision) => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await resolveFeatureRequest(contentId, decision)
        if (!result.ok) setError(result.error)
        else router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1.5">
        {ACTIONS.map(({ decision, label, title }) => (
          <Button
            key={decision}
            type="button"
            size="sm"
            variant={decision === 'dismiss' ? 'ghost' : 'outline'}
            disabled={isPending}
            title={title}
            onClick={() => run(decision)}
            className="h-7 px-2.5 text-xs"
          >
            {label}
          </Button>
        ))}
      </div>
      {error && <span className="max-w-[28rem] text-xs font-medium text-[#991b1b]">{error}</span>}
    </div>
  )
}
