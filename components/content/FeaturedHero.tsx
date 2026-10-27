import { Link } from '@/i18n/navigation'

export type HeroItem = {
  /** the address of the content, e.g. /articles/slug */
  href: string
  title: string
  imageUrl?: string | null
  topic?: { name: string; slug: string } | null
  authorName?: string | null
  /** "23 min de lectura" or the length of a video */
  meta?: string | null
}

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

/** In the middle of the big piece; in the top right corner of the small ones, so it never covers their title */
function PlayButton({ size, corner }: { size: number; corner: boolean }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute flex items-center justify-center rounded-full ${corner ? 'right-4 top-4' : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'}`}
      style={{ width: size, height: size, background: 'rgba(184,115,79,0.95)', boxShadow: '0 4px 16px rgba(44,36,32,0.3)' }}
    >
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 20 20" fill="none">
        <path d="M7 5l9 5-9 5V5z" fill="#fff" />
      </svg>
    </span>
  )
}

function HeroCard({ item, large, kind }: { item: HeroItem; large: boolean; kind: 'article' | 'video' }) {
  const details = [item.authorName, item.meta].filter(Boolean).join(' · ')
  return (
    <div className={`group relative overflow-hidden rounded-2xl ${large ? 'aspect-[16/11] sm:aspect-[16/10]' : 'aspect-[16/9] lg:aspect-auto lg:min-h-[180px] lg:flex-1'}`} style={{ background: '#2c2420' }}>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading={large ? 'eager' : 'lazy'} />
      )}
      <span aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0) 70%)' }} />
      {kind === 'video' && <PlayButton size={large ? 64 : 40} corner={!large} />}

      {/* the whole card is the link; the topic sits above it */}
      <Link href={item.href as any} aria-label={item.title} className="absolute inset-0 z-10" />
      {item.topic && (
        <Link
          href={`/tag/${item.topic.slug}` as any}
          className="absolute left-4 top-4 z-20 rounded-full px-3 py-1 text-[11px] transition-opacity hover:opacity-80"
          style={{ ...aeonik, background: 'rgba(253,252,250,0.92)', color: '#2c2420', border: '1px solid rgba(212,165,116,0.4)' }}
        >
          <span className="inline-block first-letter:uppercase">{item.topic.name}</span>
        </Link>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] p-4 sm:p-5">
        <p
          className={`line-clamp-3 leading-[1.15] text-white ${large ? 'text-[clamp(1.4rem,2.6vw,2.1rem)]' : 'text-base sm:text-lg'}`}
          style={{ ...aeonik, fontWeight: 500, letterSpacing: '-0.02em', textShadow: '0 1px 6px rgba(0,0,0,0.35)' }}
        >
          {item.title}
        </p>
        {details && <p className={`mt-1.5 text-white/85 ${large ? 'text-sm' : 'text-xs'}`} style={aeonik}>{details}</p>}
      </div>
    </div>
  )
}

/**
 * The top of the articles and videos pages: the pieces the editors starred (up to three) as a magazine cover, one big
 * and two beside it (the big one alone when there is only one). Videos carry a play button.
 */
export function FeaturedHero({ items, kind, label }: { items: HeroItem[]; kind: 'article' | 'video'; label: string }) {
  const shown = items.slice(0, 3)
  if (shown.length === 0) return null
  const [first, ...rest] = shown
  return (
    <section aria-label={label} className="mb-14">
      <div className={`grid gap-4 ${rest.length > 0 ? 'lg:grid-cols-[1.7fr_1fr]' : ''}`}>
        <HeroCard item={first} large kind={kind} />
        {rest.length > 0 && (
          <div className="flex flex-col gap-4">
            {rest.map((item) => (
              <HeroCard key={item.href} item={item} large={false} kind={kind} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
