import { PodcastPlatformIcon } from '@/components/podcasts/PodcastPlatformIcon'
import { PODCAST_NAME, platformLinks, type PodcastBanner as PodcastBannerSettings } from '@/lib/podcast-banner'

const aeonik = (weight: 300 | 400 | 500): React.CSSProperties => ({
  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  fontWeight: weight,
})

export type PodcastBannerCopy = {
  /** “Un podcast por SurGlobal & UNTOLD.ink” */
  tagline: string
  /** “Escúchalo en” */
  listenOn: string
  /** “Escuchar en {platform}”: what a logo says to people who cannot see it */
  listenOnPlatform: string
}

// the brand's lime (Lima #D2FE73 in the SurGlobal brand manual)
const LIME = '#D2FE73'

const itemClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/30 text-white transition-colors hover:border-transparent hover:bg-[#D2FE73] hover:text-black focus-visible:border-transparent focus-visible:bg-[#D2FE73] focus-visible:text-black focus-visible:outline-none'

/**
 * The banner of SurGlobal / UNTOLD.ink's own podcast: its picture (or, without one, a design in the brand colour with
 * the name) and, below it, the logos of the platforms where it can be heard, each a link. Set in Admin → Advertising.
 */
export function PodcastBanner({ banner, copy }: { banner: PodcastBannerSettings; copy: PodcastBannerCopy }) {
  if (!banner.enabled) return null

  const links = platformLinks(banner)
  const hasImage = !!banner.imageUrl

  return (
    <aside aria-label={PODCAST_NAME} data-banner="podcast" className="overflow-hidden rounded-2xl">
      {hasImage ? (
        <picture>
          {banner.mobileImageUrl && <source media="(max-width: 639px)" srcSet={banner.mobileImageUrl} />}
          <img src={banner.imageUrl} alt={banner.altText || `${PODCAST_NAME} — ${copy.tagline}`} className="block h-auto w-full" loading="lazy" />
        </picture>
      ) : (
        <div className="px-6 py-10 sm:px-10 sm:py-14" style={{ background: LIME, color: '#000' }}>
          <p style={{ ...aeonik(500), fontSize: 'clamp(1.8rem, 4vw, 3.2rem)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{PODCAST_NAME}</p>
          <p className="mt-3 text-base sm:text-lg" style={aeonik(300)}>
            {copy.tagline}
          </p>
        </div>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-black px-5 py-3 sm:px-8">
          <p className="text-sm text-white" style={aeonik(400)}>
            {copy.listenOn}
          </p>
          <ul className="flex flex-wrap items-center gap-2">
            {links.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={copy.listenOnPlatform.replace('{platform}', link.label)}
                  title={link.label}
                  className={`${itemClass} ${link.platform ? 'size-11' : 'px-4 text-sm'}`}
                  style={link.platform ? undefined : aeonik(400)}
                >
                  <PodcastPlatformIcon platform={link.platform} size={link.platform ? 22 : 16} />
                  {!link.platform && <span>{link.label}</span>}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
