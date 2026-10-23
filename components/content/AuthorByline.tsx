import { Link } from '@/i18n/navigation'
import { formatDate } from '@/lib/format-date'

/** Who wrote a piece of content (photo or initial, name, link to their page) and when it was published */
export function AuthorByline({
  author, publishedAt, locale,
}: {
  author: { display_name: string; slug: string; avatar_url?: string | null }
  publishedAt?: string | null
  locale: string
}) {
  return (
    <Link href={`/author/${author.slug}` as any} className="group mb-5 flex w-fit items-center gap-3 no-underline">
      <span className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border-2 border-primary/20">
        {author.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.avatar_url} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-primary/10 font-semibold text-primary">
            {author.display_name?.[0]?.toUpperCase() ?? '?'}
          </span>
        )}
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{author.display_name}</span>
        {publishedAt && (
          <span className="block text-xs text-muted-foreground">{formatDate(publishedAt, locale, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        )}
      </span>
    </Link>
  )
}
