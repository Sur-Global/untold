'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleSuspendUser } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  userId: string
  isSuspended: boolean
}

export function SuspendButton({ userId, isSuspended }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      try {
        await toggleSuspendUser(userId)
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
        className={`h-6 px-2 text-xs ${
          isSuspended ? 'text-green-600' : 'text-yellow-600'
        }`}
      >
        {isPending ? '…' : isSuspended ? 'Unsuspend' : 'Suspend'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
