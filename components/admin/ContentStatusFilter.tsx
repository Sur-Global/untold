'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { adminGhostButton, adminPrimaryButton } from './admin-ui'

const STATUSES = [
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'all', label: 'All' },
] as const

export function ContentStatusFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('status') ?? 'published'

  const handleClick = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status === 'published') params.delete('status')
    else params.set('status', status)
    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUSES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => handleClick(s.id)}
          className={`${current === s.id ? adminPrimaryButton : adminGhostButton} h-9 px-3.5 py-0 text-xs`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
