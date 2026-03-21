'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setUserRole } from '@/lib/actions/admin'

interface Props {
  userId: string
  currentRole: string
}

export function RoleSelect({ userId, currentRole }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as 'user' | 'author' | 'admin'
    setError(null)
    startTransition(async () => {
      try {
        await setUserRole(userId, role)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <select
        defaultValue={currentRole}
        onChange={handleChange}
        disabled={isPending}
        className="rounded border bg-background px-2 py-1 text-xs"
      >
        <option value="user">user</option>
        <option value="author">author</option>
        <option value="admin">admin</option>
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
