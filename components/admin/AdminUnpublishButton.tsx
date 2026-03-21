'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminUnpublishContent } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  contentId: string
}

export function AdminUnpublishButton({ contentId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    if (!confirm('Unpublish this content? It will be moved back to draft.')) return
    setError(null)
    startTransition(async () => {
      try {
        await adminUnpublishContent(contentId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
      >
        {isPending ? '…' : 'Unpublish'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
