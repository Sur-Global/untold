import { Link } from '@/i18n/navigation'
import { cloudFontSize, type CloudTag } from '@/lib/tag-cloud'

const BORDERS = ['rgba(0,0,0,0.18)', 'rgba(169,168,233,0.6)', 'rgba(210,254,115,0.8)']
const colorOf = (slug: string) => BORDERS[[...slug].reduce((n, ch) => n + ch.charCodeAt(0), 0) % BORDERS.length]

/**
 * The topics of a listing page as a cloud: bigger the more content they have. Each one filters the listing
 * (?tag=…); the chosen one is highlighted and clicking it again, or "All", shows everything.
 */
export function TagCloud({ tags, activeSlug, basePath, label, allLabel, keep = {} }: {
  tags: CloudTag[]
  activeSlug?: string
  basePath: string
  label: string
  allLabel: string
  /** other filters of the page (search, order…) that the links must keep */
  keep?: Record<string, string | undefined>
}) {
  if (tags.length === 0) return null
  // address of the listing with the page's other filters and, if given, a topic
  const hrefFor = (tag?: string) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(keep)) if (value) params.set(key, value)
    if (tag) params.set('tag', tag)
    const qs = params.toString()
    return (qs ? `${basePath}?${qs}` : basePath) as any
  }
  const counts = tags.map((t) => t.count)
  const [min, max] = [Math.min(...counts), Math.max(...counts)]
  const chip = (active: boolean, border: string): React.CSSProperties => ({
    border: `1.5px solid ${active ? '#A9A8E9' : border}`,
    background: active ? '#A9A8E9' : '#fff',
    color: '#000',
    fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  })
  return (
    <nav aria-label={label} className="mt-8 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-2">
      {activeSlug && (
        <Link href={hrefFor()} scroll={false} className="rounded-full px-3 py-1 text-sm underline" style={{ color: '#6b6ad0', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}>
          {allLabel}
        </Link>
      )}
      {tags.map((tag) => {
        const active = tag.slug === activeSlug
        return (
          <Link
            key={tag.slug}
            href={hrefFor(active ? undefined : tag.slug)}
            scroll={false}
            aria-current={active ? 'true' : undefined}
            title={`${tag.count}`}
            className="rounded-full px-3.5 py-1 leading-tight transition-colors hover:bg-[#A9A8E9]/40"
            style={{ ...chip(active, colorOf(tag.slug)), fontSize: cloudFontSize(tag.count, min, max) }}
          >
            {tag.name}
          </Link>
        )
      })}
    </nav>
  )
}
