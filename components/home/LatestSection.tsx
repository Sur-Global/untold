import { Link } from '@/i18n/navigation'

const aeonik = (weight: 300 | 400 | 500): React.CSSProperties => ({
  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  fontWeight: weight,
})

export type LatestItem = {
  slug: string
  title: string
  coverImageUrl: string | null
  categoryTag: string | null
  authorName: string | null
  /** e.g. "4 sep" */
  dateLabel: string | null
  /** e.g. "14 min de lectura" */
  readTimeLabel: string | null
  isNew: boolean
}

export type LatestEditorial = {
  slug: string
  title: string
  excerpt: string
  authorName: string | null
  authorSlug: string | null
  authorAvatarUrl: string | null
  dateLabel: string | null
  /** the numbered issue it belongs to, when it has one (the card's label then links to it) */
  issue?: { label: string; href: string } | null
}

export type LatestLabels = {
  title: string
  viewAll: string
  editorial: string
  readMore: string
  newBadge: string
}

interface Props {
  items: LatestItem[]
  editorial: LatestEditorial | null
  labels: LatestLabels
}

export function ArticleRow({ item, labels, first }: { item: LatestItem; labels: LatestLabels; first: boolean }) {
  const meta = [item.authorName, item.dateLabel, item.readTimeLabel].filter(Boolean).join(' · ')
  return (
    <Link
      href={`/articles/${item.slug}`}
      className={`flex gap-4 py-4 no-underline ${first ? 'pt-0' : 'border-t border-black/10'}`}
      style={{ color: '#000' }}
    >
      <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl sm:w-44" style={{ background: '#2C2420' }}>
        {item.coverImageUrl && (
          <img src={item.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {item.categoryTag && (
            <span className="rounded-full border border-black/10 bg-white px-2.5 py-0.5 text-[11px] text-[#444]" style={aeonik(400)}>
              {item.categoryTag}
            </span>
          )}
          {item.isNew && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] text-black" style={{ ...aeonik(400), background: '#D2FE73' }}>
              {labels.newBadge}
            </span>
          )}
        </div>
        <h3 className="line-clamp-3 text-[17px] leading-snug sm:text-[19px]" style={{ ...aeonik(500), letterSpacing: '-0.01em' }}>
          {item.title}
        </h3>
        {meta && (
          <p className="mt-1.5 text-xs" style={{ ...aeonik(300), color: '#666' }}>
            {meta}
          </p>
        )}
      </div>
    </Link>
  )
}

export function EditorialCard({ editorial, labels }: { editorial: LatestEditorial; labels: LatestLabels }) {
  const initial = (editorial.authorName ?? '?').trim().charAt(0).toUpperCase()
  return (
    <article className="rounded-2xl p-6 lg:p-7" style={{ background: '#000', color: '#fff' }}>
      <p className="mb-3 text-[11px] uppercase tracking-[0.08em]" style={{ ...aeonik(300), color: '#A9A8E9' }}>
        {editorial.issue ? (
          <Link href={editorial.issue.href} className="no-underline hover:underline" style={{ color: '#A9A8E9' }}>
            {labels.editorial} · {editorial.issue.label}
          </Link>
        ) : (
          labels.editorial
        )}
      </p>
      <h3 className="mb-3 text-[22px] leading-[1.15]" style={{ ...aeonik(500), letterSpacing: '-0.02em' }}>
        <Link href={`/articles/${editorial.slug}`} className="no-underline" style={{ color: '#fff' }}>
          {editorial.title}
        </Link>
      </h3>
      {editorial.excerpt && (
        <p className="line-clamp-6 text-sm leading-relaxed" style={{ ...aeonik(300), color: '#C9C4BD' }}>
          {editorial.excerpt}
        </p>
      )}
      <div className="mt-5 flex items-center gap-3">
        {editorial.authorAvatarUrl ? (
          <img src={editorial.authorAvatarUrl} alt="" className="size-9 rounded-full object-cover" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-white/15 text-sm" style={aeonik(400)}>
            {initial}
          </span>
        )}
        <p className="text-xs leading-snug" style={{ ...aeonik(300), color: '#C9C4BD' }}>
          {editorial.authorSlug && editorial.authorName ? (
            <Link href={`/author/${editorial.authorSlug}`} className="no-underline" style={{ ...aeonik(400), color: '#fff' }}>
              {editorial.authorName}
            </Link>
          ) : (
            editorial.authorName
          )}
          {editorial.dateLabel && <span className="block">{editorial.dateLabel}</span>}
        </p>
      </div>
      <Link
        href={`/articles/${editorial.slug}`}
        className="mt-5 inline-flex h-10 items-center rounded-full px-5 text-sm text-black no-underline transition-opacity hover:opacity-90"
        style={{ ...aeonik(400), background: '#D2FE73' }}
      >
        {labels.readMore} →
      </Link>
    </article>
  )
}

/**
 * Homepage section "Lo más reciente": the newest articles, with the latest editorial beside them
 * (signed with the profile of whoever wrote it). Without an editorial the list takes the full width.
 */
export function LatestSection({ items, editorial, labels }: Props) {
  if (items.length === 0 && !editorial) return null
  return (
    <section data-section="latest">
      <div className="flex items-end justify-between pb-4" style={{ borderBottom: '2px solid #000' }}>
        <h2 style={{ color: '#000' }}>{labels.title}</h2>
        <Link
          href="/articles"
          className="shrink-0 text-sm hover:underline"
          style={{ ...aeonik(500), color: '#A9A8E9' }}
        >
          {labels.viewAll} →
        </Link>
      </div>

      <div className={`mt-6 grid gap-8 ${editorial ? 'lg:grid-cols-[5fr_8fr]' : ''}`}>
        {editorial && <EditorialCard editorial={editorial} labels={labels} />}
        {items.length > 0 && (
          <div className={editorial ? '' : 'grid gap-x-10 md:grid-cols-2'}>
            {items.map((item, i) => (
              <ArticleRow key={item.slug} item={item} labels={labels} first={editorial ? i === 0 : i < 2} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
