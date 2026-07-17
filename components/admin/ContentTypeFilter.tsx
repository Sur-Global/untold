'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { adminGhostButton, adminPrimaryButton } from './admin-ui'

const TYPES = [
  { id: 'all', label: 'All' },
  { id: 'article', label: 'Articles' },
  { id: 'video', label: 'Videos' },
  { id: 'podcast', label: 'Podcasts' },
  { id: 'pill', label: 'Pills' },
  { id: 'course', label: 'Courses' },
] as const

export function ContentTypeFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentType = searchParams.get('type') ?? 'all'

  const handleClick = (type: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (type === 'all') params.delete('type')
    else params.set('type', type)
    // Changing the type filter resets pagination back to page 1
    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {TYPES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => handleClick(t.id)}
          className={`${currentType === t.id ? adminPrimaryButton : adminGhostButton} h-9 px-3.5 py-0 text-xs`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
