'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface Props {
  label: string
  field: string
  defaultOrder?: 'asc' | 'desc'
}

export function SortableHeader({ label, field, defaultOrder = 'asc' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSort = searchParams.get('sort')
  const currentOrder = (searchParams.get('order') as 'asc' | 'desc') ?? 'asc'
  const isActive = currentSort === field

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString())
    const nextOrder = isActive ? (currentOrder === 'asc' ? 'desc' : 'asc') : defaultOrder
    params.set('sort', field)
    params.set('order', nextOrder)
    // Changing sort resets pagination back to page 1
    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {isActive && <span aria-hidden>{currentOrder === 'asc' ? '↑' : '↓'}</span>}
    </button>
  )
}
