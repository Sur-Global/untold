'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePathname, useRouter } from '@/i18n/navigation'
import type { DashboardSort } from '@/lib/dashboard-filters'

export type DashboardFiltersLabels = {
  searchPlaceholder: string
  searchLabel: string
  typeLabel: string
  all: string
  statusLabel: string
  published: string
  drafts: string
  sortLabel: string
  sortNewest: string
  sortOldest: string
  sortEdited: string
  sortTitle: string
  clear: string
  /** plural names of the kinds of content ("Artículos"…) */
  types: Record<string, string>
}

interface Props {
  labels: DashboardFiltersLabels
  /** kinds of content the creator has, with how many of each, in the order they are shown */
  types: { id: string; count: number }[]
  counts: { all: number; published: number; draft: number }
}

const chip = (active: boolean): React.CSSProperties => ({
  border: `1px solid ${active ? '#8b4513' : 'rgba(139,69,19,0.2)'}`,
  background: active ? '#8b4513' : 'transparent',
  color: active ? '#fff' : '#4b3a2a',
})
const chipClass = 'h-8 shrink-0 rounded-full px-3 text-xs font-mono transition-colors'

/** Filters of "Mi contenido": kind, status, words in the title and order. Everything lives in the address. */
export function DashboardFilters({ labels, types, counts }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const type = searchParams.get('type') ?? ''
  const status = searchParams.get('status') ?? ''
  const sort = (searchParams.get('sort') as DashboardSort | null) ?? 'newest'
  const [text, setText] = useState(searchParams.get('q') ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const update = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    params.delete('limit') // a new filter starts again from the first page
    const qs = params.toString()
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  const onSearch = (value: string) => {
    setText(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => update({ q: value.trim() || null }), 300)
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const hasFilters = !!(text || type || status || sort !== 'newest')

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={text}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchLabel}
          className="h-9 w-full max-w-[260px] rounded-full bg-white px-4 text-sm outline-none"
          style={{ border: '1px solid rgba(139,69,19,0.25)' }}
        />
        <select
          aria-label={labels.sortLabel}
          value={sort}
          onChange={(e) => update({ sort: e.target.value === 'newest' ? null : e.target.value })}
          className="h-9 rounded-full bg-white px-3 text-sm outline-none"
          style={{ border: '1px solid rgba(139,69,19,0.25)' }}
        >
          <option value="newest">{labels.sortNewest}</option>
          <option value="oldest">{labels.sortOldest}</option>
          <option value="edited">{labels.sortEdited}</option>
          <option value="title">{labels.sortTitle}</option>
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setText(''); startTransition(() => router.replace(pathname, { scroll: false })) }}
            className="text-sm underline"
            style={{ color: '#8b4513' }}
          >
            {labels.clear}
          </button>
        )}
      </div>

      {types.length > 1 && (
        <div role="group" aria-label={labels.typeLabel} className="flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={type === ''} onClick={() => update({ type: null })} className={chipClass} style={chip(type === '')}>
            {labels.all} ({counts.all})
          </button>
          {types.map((t) => (
            <button key={t.id} type="button" aria-pressed={type === t.id} onClick={() => update({ type: t.id })} className={chipClass} style={chip(type === t.id)}>
              {labels.types[t.id]} ({t.count})
            </button>
          ))}
        </div>
      )}

      {counts.published > 0 && counts.draft > 0 && (
        <div role="group" aria-label={labels.statusLabel} className="flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={status === ''} onClick={() => update({ status: null })} className={chipClass} style={chip(status === '')}>
            {labels.all}
          </button>
          <button type="button" aria-pressed={status === 'published'} onClick={() => update({ status: 'published' })} className={chipClass} style={chip(status === 'published')}>
            {labels.published} ({counts.published})
          </button>
          <button type="button" aria-pressed={status === 'draft'} onClick={() => update({ status: 'draft' })} className={chipClass} style={chip(status === 'draft')}>
            {labels.drafts} ({counts.draft})
          </button>
        </div>
      )}
    </div>
  )
}
