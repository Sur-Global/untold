'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { retranslateAll } from '@/lib/actions/translate'

export function TranslateAllButton({ contentId }: { contentId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleClick = () => {
    setError(null)
    setDone(false)
    startTransition(async () => {
      try {
        await retranslateAll(contentId)
        setDone(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  if (done) return <span className="text-xs text-secondary font-['JetBrains_Mono',monospace]">queued ✓</span>

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs font-['JetBrains_Mono',monospace] text-primary underline-offset-4 hover:underline disabled:opacity-50"
      >
        {isPending ? '…' : 'Translate all'}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  )
}
