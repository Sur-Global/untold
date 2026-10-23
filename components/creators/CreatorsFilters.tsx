'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePathname, useRouter } from '@/i18n/navigation'
import type { CreatorSort } from '@/lib/creators'

const aeonik = (weight: 300 | 400 | 500): React.CSSProperties => ({
  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  fontWeight: weight,
})

export type CreatorsFiltersLabels = {
  searchPlaceholder: string
  searchLabel: string
  sortLabel: string
  sortAz: string
  sortContent: string
  sortRecent: string
  countryLabel: string
  countryAll: string
  topicLabel: string
  topicAll: string
  letterLabel: string
  letterAll: string
  clear: string
}

interface Props {
  labels: CreatorsFiltersLabels
  /** only countries that have creators */
  countries: { code: string; name: string }[]
  /** topics that creators write about */
  topics: { slug: string; name: string }[]
  /** initials that have creators */
  letters: string[]
}

const selectClass = 'h-10 rounded-full border border-black/15 bg-white px-4 text-sm text-black outline-none focus:border-black/40'

/** The filter bar of the Creators page. Everything lives in the address (?q=…&sort=…), so a filtered list can be shared. */
export function CreatorsFilters({ labels, countries, topics, letters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const sort = (searchParams.get('sort') as CreatorSort | null) ?? 'az'
  const country = searchParams.get('country') ?? ''
  const tag = searchParams.get('tag') ?? ''
  const letter = searchParams.get('letter') ?? ''
  const [text, setText] = useState(searchParams.get('q') ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const update = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const qs = params.toString()
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  const onSearch = (value: string) => {
    setText(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => update({ q: value.trim() || null }), 300)
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const hasFilters = !!(text || country || tag || letter || sort !== 'az')
  const sorts: { id: CreatorSort; label: string }[] = [
    { id: 'az', label: labels.sortAz },
    { id: 'content', label: labels.sortContent },
    { id: 'recent', label: labels.sortRecent },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <input
          type="search"
          value={text}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchLabel}
          className="h-10 w-full max-w-[260px] rounded-full border border-black/15 bg-white px-4 text-sm text-black outline-none focus:border-black/40"
          style={aeonik(300)}
        />
        <div role="group" aria-label={labels.sortLabel} className="inline-flex overflow-hidden rounded-full border border-black/15 bg-white">
          {sorts.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={sort === s.id}
              onClick={() => update({ sort: s.id === 'az' ? null : s.id })}
              className="h-10 px-4 text-sm transition-colors"
              style={{ ...aeonik(400), background: sort === s.id ? '#000' : 'transparent', color: sort === s.id ? '#fff' : '#000' }}
            >
              {s.label}
            </button>
          ))}
        </div>
        {countries.length > 0 && (
          <select aria-label={labels.countryLabel} value={country} onChange={(e) => update({ country: e.target.value || null })} className={selectClass} style={aeonik(300)}>
            <option value="">{labels.countryAll}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        )}
        {topics.length > 0 && (
          <select aria-label={labels.topicLabel} value={tag} onChange={(e) => update({ tag: e.target.value || null })} className={selectClass} style={aeonik(300)}>
            <option value="">{labels.topicAll}</option>
            {topics.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        )}
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setText(''); startTransition(() => router.replace(pathname, { scroll: false })) }}
            className="text-sm underline"
            style={{ ...aeonik(400), color: '#6b6ad0' }}
          >
            {labels.clear}
          </button>
        )}
      </div>

      {letters.length > 1 && (
        <nav aria-label={labels.letterLabel} className="flex flex-wrap items-center justify-center gap-1 text-xs">
          <button
            type="button"
            aria-pressed={letter === ''}
            onClick={() => update({ letter: null })}
            className="rounded-md px-2 py-1"
            style={{ ...aeonik(400), background: letter === '' ? '#A9A8E9' : 'transparent', color: '#000' }}
          >
            {labels.letterAll}
          </button>
          {letters.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={letter === l}
              onClick={() => update({ letter: letter === l ? null : l })}
              className="min-w-6 rounded-md px-1.5 py-1"
              style={{ ...aeonik(400), background: letter === l ? '#A9A8E9' : 'transparent', color: letter === l ? '#000' : '#555' }}
            >
              {l}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
