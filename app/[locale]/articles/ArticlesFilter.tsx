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
  { text: '#6b8e23', border: 'rgba(107,142,35,0.3)' },
  { text: '#a0522d', border: 'rgba(160,82,45,0.3)' },
  { text: '#8b4513', border: 'rgba(139,69,19,0.3)' },
  { text: '#b8860b', border: 'rgba(184,134,11,0.3)' },
  { text: '#8b7355', border: 'rgba(139,115,85,0.3)' },
  { text: '#2e8b57', border: 'rgba(46,139,87,0.3)' },
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
            style={{ color: 'rgba(44,36,32,0.4)' }}
          >
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-[60px] pl-12 pr-4 rounded-[10px] bg-white text-base text-foreground placeholder:text-[rgba(44,36,32,0.4)] focus:outline-none transition-shadow"
            style={{
              border: '1.5px solid rgba(139,69,19,0.15)',
              boxShadow: '0px 2px 8px rgba(44,36,32,0.08), 0px 4px 16px rgba(44,36,32,0.04)',
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
                      background: '#a0522d',
                      color: 'white',
                      border: '1.5px solid #a0522d',
                      boxShadow: '0 2px 8px rgba(44,36,32,0.08)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }
                  : {
                      background: 'white',
                      color: '#5a4a42',
                      border: '1.5px solid rgba(139,69,19,0.15)',
                      boxShadow: '0 2px 8px rgba(44,36,32,0.08)',
                      fontFamily: 'JetBrains Mono, monospace',
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
                  color: color.text,
                  border: `1px solid ${color.border}`,
                  background: isActive ? color.border : 'white',
                  fontFamily: 'Inter, sans-serif',
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
