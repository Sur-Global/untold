import { Link } from '@/i18n/navigation'
import type { TopicLink } from '@/lib/topics'

/** The tags of a piece of content that are not its topics, small, at its end */
export function OtherTags({ tags, label, className = 'mt-10' }: { tags: TopicLink[]; label: string; className?: string }) {
  if (tags.length === 0) return null
  return (
    <p className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-black/10 pt-4 text-[13px] text-[#6B5F58] ${className}`}>
      <span>{label}:</span>
      {tags.map((tag) => (
        <Link key={tag.slug} href={`/tag/${tag.slug}` as any} className="underline-offset-4 hover:text-black hover:underline">
          {tag.name}
        </Link>
      ))}
    </p>
  )
}
