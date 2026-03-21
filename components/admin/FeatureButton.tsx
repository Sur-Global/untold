'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleFeatured } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  contentId: string
  isFeatured: boolean
}

export function FeatureButton({ contentId, isFeatured }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      try {
        await toggleFeatured(contentId)
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
        className={`h-6 px-2 text-sm ${
          isFeatured ? 'text-green-600' : 'text-muted-foreground'
        }`}
      >
        {isPending ? '…' : isFeatured ? '★' : '☆'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
