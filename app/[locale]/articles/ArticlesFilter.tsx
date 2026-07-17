'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition, useState, useEffect, useRef } from 'react'

export interface TagItem {
  slug: string
  name: string
  colorIndex: number
}

interface ArticlesFilterProps {
  tags: TagItem[]
  searchPlaceholder: string
  labelFeatured: string
  labelTrending: string
  labelRecent: string
  labelAll: string
}

const TAG_COLORS = [
  { text: '#000', border: 'rgba(0,0,0,0.18)' },
  { text: '#000', border: 'rgba(169,168,233,0.55)' },
  { text: '#000', border: 'rgba(210,254,115,0.7)' },
  { text: '#000', border: 'rgba(0,0,0,0.18)' },
  { text: '#000', border: 'rgba(169,168,233,0.55)' },
  { text: '#000', border: 'rgba(210,254,115,0.7)' },
]

export function ArticlesFilter({
  tags,
  searchPlaceholder,
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
  const currentTag = searchParams.get('tag') ?? ''
  const currentQ = searchParams.get('q') ?? ''

  const [inputValue, setInputValue] = useState(currentQ)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleSearch = (value: string) => {
    setInputValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParams({ q: value || null })
    }, 400)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const filters = [
    { id: 'all', label: labelAll },
    { id: 'featured', label: labelFeatured },
    { id: 'trending', label: labelTrending },
    { id: 'recent', label: labelRecent },
  ]

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="flex justify-center">
        <div className="relative w-full max-w-[672px]">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            style={{ color: 'rgba(0,0,0,0.35)' }}
          >
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-[60px] pl-12 pr-4 rounded-[10px] bg-white text-base text-foreground placeholder:text-[rgba(0,0,0,0.35)] focus:outline-none transition-shadow"
            style={{
              border: '1.5px solid rgba(0,0,0,0.15)',
              boxShadow: '0px 2px 8px rgba(0,0,0,0.06), 0px 4px 16px rgba(0,0,0,0.03)',
            }}
          />
        </div>
      </div>

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

      {/* Tag cloud */}
      {tags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {tags.map((tag) => {
            const color = TAG_COLORS[tag.colorIndex % TAG_COLORS.length]
            const isActive = currentTag === tag.slug
            return (
              <button
                key={tag.slug}
                type="button"
                onClick={() => updateParams({ tag: isActive ? null : tag.slug })}
                className="h-[38px] px-4 rounded-full text-sm transition-colors"
                style={{
                  color: '#000',
                  border: `1.5px solid ${isActive ? '#A9A8E9' : color.border}`,
                  background: isActive ? '#A9A8E9' : 'white',
                  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                }}
              >
                {tag.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
