import { Link } from '@/i18n/navigation'
import type { CloudTag } from '@/lib/tag-cloud'
import { pickTopicStrip } from '@/lib/topics'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

const chipClass = 'shrink-0 rounded-full border px-3.5 py-1 text-sm leading-tight transition-colors first-letter:uppercase'

/**
 * The topics of a listing page in one row: "Explore | All | Topic · Topic … | All topics →". Each topic filters the
 * listing (?tag=…); the chosen one is highlighted and "All" (or clicking it again) shows everything. On a phone the row slides.
 */
export function TopicStrip({ tags, activeSlug, basePath, label, exploreLabel, allLabel, allTopicsLabel, keep = {} }: {
  tags: CloudTag[]
  activeSlug?: string
  basePath: string
  /** what the row is for, for people who cannot see it */
  label: string
  exploreLabel: string
  allLabel: string
  allTopicsLabel: string
  /** other filters of the page (search, order…) that the links must keep */
  keep?: Record<string, string | undefined>
}) {
  const topics = pickTopicStrip(tags, activeSlug)
  if (topics.length === 0) return null

  // address of the listing with the page's other filters and, if given, a topic
  const hrefFor = (tag?: string) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(keep)) if (value) params.set(key, value)
    if (tag) params.set('tag', tag)
    const qs = params.toString()
    return (qs ? `${basePath}?${qs}` : basePath) as any
  }

  return (
    <nav aria-label={label} className="mt-8 flex items-center gap-2 overflow-x-auto border-y border-black/10 py-3 [scrollbar-width:none]" style={aeonik}>
      <span className="shrink-0 pr-1 text-xs uppercase tracking-[0.08em] text-[#6B5F58]">{exploreLabel}</span>
      <span aria-hidden className="h-4 w-px shrink-0 bg-black/20" />
      <Link
        href={hrefFor()}
        scroll={false}
        aria-current={!activeSlug ? 'true' : undefined}
        className={`${chipClass} ${!activeSlug ? 'border-black bg-black text-white' : 'border-black/20 bg-white text-black hover:bg-[#A9A8E9]/40'}`}
      >
        {allLabel}
      </Link>
      {topics.map((topic) => {
        const active = topic.slug === activeSlug
        return (
          <Link
            key={topic.slug}
            href={hrefFor(active ? undefined : topic.slug)}
            scroll={false}
            aria-current={active ? 'true' : undefined}
            className={`${chipClass} ${active ? 'border-black bg-black text-white' : 'border-black/20 bg-white text-black hover:bg-[#A9A8E9]/40'}`}
          >
            {topic.name}
          </Link>
        )
      })}
      <Link href={'/topics' as any} className="ml-auto shrink-0 pl-4 text-sm text-[#6b6ad0] underline-offset-4 hover:underline">
        {allTopicsLabel}
      </Link>
    </nav>
  )
}
