import { Link } from '@/i18n/navigation'

const aeonik = (weight: 300 | 400 | 500): React.CSSProperties => ({
  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  fontWeight: weight,
})

export type CreatorCardProps = {
  slug: string
  name: string
  avatarUrl: string | null
  /** country name in the reader's language */
  country: string | null
  bio: string
  /** e.g. "5 artículos · 1 video" */
  countsLabel: string
}

/** One creator in the Creators page: photo, name, country, a line of biography and what they published */
export function CreatorCard({ slug, name, avatarUrl, country, bio, countsLabel }: CreatorCardProps) {
  return (
    <Link
      href={`/author/${slug}`}
      className="flex flex-col items-center rounded-2xl border border-black/10 bg-white p-5 text-center no-underline transition-shadow hover:shadow-lg"
      style={{ color: '#000' }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="mb-3 size-20 rounded-full object-cover" loading="lazy" />
      ) : (
        <span className="mb-3 flex size-20 items-center justify-center rounded-full text-2xl" style={{ ...aeonik(400), background: '#A9A8E9' }}>
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <h3 className="text-[17px] leading-snug" style={{ ...aeonik(500), letterSpacing: '-0.01em' }}>
        {name}
      </h3>
      {country && (
        <p className="mt-0.5 text-xs" style={{ ...aeonik(400), color: '#6b6ad0' }}>
          {country}
        </p>
      )}
      {bio && (
        <p className="mt-2 line-clamp-2 text-[13px] leading-snug" style={{ ...aeonik(300), color: '#555' }}>
          {bio}
        </p>
      )}
      {countsLabel && (
        <p className="mt-3 w-full border-t border-black/10 pt-3 text-xs" style={{ ...aeonik(300), color: '#333' }}>
          {countsLabel}
        </p>
      )}
    </Link>
  )
}
