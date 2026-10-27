'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

interface ArticlesFilterProps {
  labelFeatured: string
  labelTrending: string
  labelRecent: string
  labelAll: string
}

export function ArticlesFilter({
  labelFeatured,
  labelTrending,
  labelRecent,
  labelAll,
}: ArticlesFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const currentFilter = searchParams.get('filter') ?? 'all'

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (!value) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      params.delete('limit')
      const qs = params.toString()
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname)
      })
    },
    [router, pathname, searchParams]
  )

  const filters = [
    { id: 'all', label: labelAll },
    { id: 'featured', label: labelFeatured },
    { id: 'trending', label: labelTrending },
    { id: 'recent', label: labelRecent },
  ]

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex flex-wrap justify-center gap-2">
        {filters.map((f) => {
          const isActive = currentFilter === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => updateParams({ filter: f.id === 'all' ? null : f.id })}
              className="h-[44px] px-5 rounded-[10px] text-sm tracking-[0.28px] transition-colors"
              style={
                isActive
                  ? {
                      background: '#000',
                      color: '#fff',
                      border: '1.5px solid #000',
                      fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                    }
                  : {
                      background: 'white',
                      color: '#000',
                      border: '1.5px solid rgba(0,0,0,0.18)',
                      fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                    }
              }
            >
              {f.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
