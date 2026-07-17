'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { adminGhostButton } from './admin-ui'

interface Props {
  page: number
  totalPages: number
}

export function AdminPagination({ page, totalPages }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  const goTo = (target: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (target <= 1) params.delete('page')
    else params.set('page', String(target))
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
        className={`${adminGhostButton} h-9 px-3.5 py-0 text-xs disabled:pointer-events-none disabled:opacity-40`}
      >
        ← Prev
      </button>
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
        className={`${adminGhostButton} h-9 px-3.5 py-0 text-xs disabled:pointer-events-none disabled:opacity-40`}
      >
        Next →
      </button>
    </div>
  )
}
