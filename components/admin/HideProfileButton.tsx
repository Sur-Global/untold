'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleProfileHidden } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  userId: string
  isHidden: boolean
}

/** Admin only: hides a profile from the public site (a test account, for example) or shows it again. */
export function HideProfileButton({ userId, isHidden }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      try {
        await toggleProfileHidden(userId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        title={isHidden ? 'Show this profile on the public site again' : 'Hide this profile from the public site (Creators list, author page, content listings)'}
        className="h-6 px-2 text-xs text-slate-700"
      >
        {isPending ? '…' : isHidden ? 'Show publicly' : 'Hide from public'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
