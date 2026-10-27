import { Link } from '@/i18n/navigation'
import type { TopicLink } from '@/lib/topics'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

/**
 * The top of a topic's page: its name, a sentence about it and (optionally) a picture, then a bar to explore the
 * topics that most often go with it. Without a picture, the text sits on the brand's lime.
 */
export function TopicHeader({ name, eyebrow, description, imageUrl, countLabel, exploreLabel, related, allTopicsLabel }: {
  name: string
  /** “Tema” */
  eyebrow: string
  description?: string | null
  imageUrl?: string | null
  countLabel: string
  exploreLabel: string
  related: TopicLink[]
  allTopicsLabel: string
}) {
  const text = (
    <div className={imageUrl ? '' : 'max-w-2xl'}>
      <p className="mb-3 text-xs uppercase tracking-[0.1em] text-black/60" style={aeonik}>{eyebrow}</p>
      <h1 className="mb-4 first-letter:uppercase" style={{ ...aeonik, fontWeight: 500, letterSpacing: '-0.02em' }}>{name}</h1>
      {description && <p className="max-w-xl text-lg leading-relaxed text-[#3d342f]">{description}</p>}
      <p className="mt-5 font-mono text-sm text-[#6B5F58]">{countLabel}</p>
    </div>
  )
  return (
    <header className="mb-12">
      {imageUrl ? (
        <div className="grid items-center gap-8 md:grid-cols-2">
          <img src={imageUrl} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />
          {text}
        </div>
      ) : (
        <div className="rounded-2xl px-6 py-10 sm:px-10 sm:py-14" style={{ background: '#D2FE73', color: '#000' }}>{text}</div>
      )}
      <nav aria-label={exploreLabel} className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-y border-black/10 py-3 text-sm" style={aeonik}>
        <span className="text-xs uppercase tracking-[0.08em] text-[#6B5F58]">{exploreLabel}</span>
        <span aria-hidden className="h-4 w-px bg-black/20" />
        <span aria-current="page" className="font-medium text-black first-letter:uppercase">{name}</span>
        {related.map((topic) => (
          <Link key={topic.slug} href={`/tag/${topic.slug}` as any} className="text-[#6B5F58] first-letter:uppercase hover:text-black">
            {topic.name}
          </Link>
        ))}
        <Link href={'/topics' as any} className="text-[#6b6ad0] underline-offset-4 hover:underline">{allTopicsLabel}</Link>
      </nav>
    </header>
  )
}
