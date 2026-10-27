import { Link } from '@/i18n/navigation'
import type { TopicLink } from '@/lib/topics'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

/**
 * Above the title of a piece of content: its main topic and, next to it, one more to explore.
 * Shows nothing when the content has no topic.
 */
export function TopicKicker({ primary, related, exploreAlso, className = 'mb-6' }: { primary: TopicLink | null; related: TopicLink | null; exploreAlso: string; className?: string }) {
  if (!primary) return null
  return (
    <p className={`flex flex-wrap items-baseline gap-x-5 gap-y-1 ${className}`} style={aeonik}>
      <Link
        href={`/tag/${primary.slug}` as any}
        className="border-b-[1.5px] border-black pb-px text-[13px] font-medium uppercase tracking-[0.1em] text-black no-underline transition-colors hover:border-[#6b6ad0] hover:text-[#6b6ad0]"
      >
        {primary.name}
      </Link>
      {related && (
        <span className="text-[13px] text-[#6B5F58]">
          {exploreAlso}:{' '}
          <Link href={`/tag/${related.slug}` as any} className="inline-block text-[#6b6ad0] underline-offset-4 first-letter:uppercase hover:underline">
            {related.name}
          </Link>
        </span>
      )}
    </p>
  )
}
