'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteUser } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  userId: string
  displayName: string | null
}

export function DeleteUserButton({ userId, displayName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    const name = displayName ?? 'this user'
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return
    setError(null)
    startTransition(async () => {
      try {
        await deleteUser(userId)
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
        className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
      >
        {isPending ? '…' : 'Delete'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
