/** The banner for SurGlobal / UNTOLD.ink's own podcast, on the podcasts page (set in Admin → Advertising). */

/** The name of the podcast: a proper name, the same in every language */
export const PODCAST_NAME = 'El Lado Incómodo de la Innovación'

/** The usual podcast platforms, in the order their logos are shown */
export const PODCAST_PLATFORMS = ['spotify', 'apple', 'youtube', 'ytmusic', 'amazon', 'deezer', 'pocketcasts', 'castbox', 'rss'] as const
export type PodcastPlatform = (typeof PODCAST_PLATFORMS)[number]

export const PODCAST_PLATFORM_LABELS: Record<PodcastPlatform, string> = {
  spotify: 'Spotify',
  apple: 'Apple Podcasts',
  youtube: 'YouTube',
  ytmusic: 'YouTube Music',
  amazon: 'Amazon Music',
  deezer: 'Deezer',
  pocketcasts: 'Pocket Casts',
  castbox: 'Castbox',
  rss: 'RSS',
}

/** Another platform, with no logo of its own: its name and its link */
export type OtherPlatform = { label: string; url: string }
export const OTHER_PLATFORM_SLOTS = 2

export type PodcastBanner = {
  /** switched off = nothing is shown */
  enabled: boolean
  /** wide picture with the name of the podcast; empty = a design in the brand colour with its name */
  imageUrl: string
  /** optional picture for phones (a taller crop of the same ad) */
  mobileImageUrl: string
  /** describes the picture for people who cannot see it */
  altText: string
  /** where each platform's logo goes; empty = that logo is not shown */
  links: Record<PodcastPlatform, string>
  others: OtherPlatform[]
}

export const DEFAULT_PODCAST_BANNER: PodcastBanner = {
  // the podcast is not out yet: it is switched on when there is something to listen to
  enabled: false,
  imageUrl: '',
  mobileImageUrl: '',
  altText: '',
  links: Object.fromEntries(PODCAST_PLATFORMS.map((p) => [p, ''])) as Record<PodcastPlatform, string>,
  others: [],
}

/** Only web addresses are allowed in a link or picture of the banner — never javascript:, data: or mailto: */
export function safeWebUrl(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim() : ''
  return /^https?:\/\/[^\s]+$/i.test(value) && value.length <= 2000 ? value : ''
}

function text(raw: unknown, max: number): string {
  return typeof raw === 'string' ? raw.trim().slice(0, max) : ''
}

export function normalizePodcastBanner(raw: unknown): PodcastBanner {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const links = (r.links && typeof r.links === 'object' ? r.links : {}) as Record<string, unknown>
  const others = Array.isArray(r.others) ? r.others : []
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : DEFAULT_PODCAST_BANNER.enabled,
    imageUrl: safeWebUrl(r.imageUrl),
    mobileImageUrl: safeWebUrl(r.mobileImageUrl),
    altText: text(r.altText, 200),
    links: Object.fromEntries(PODCAST_PLATFORMS.map((p) => [p, safeWebUrl(links[p])])) as Record<PodcastPlatform, string>,
    others: others
      .map((o) => {
        const other = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>
        return { label: text(other.label, 40), url: safeWebUrl(other.url) }
      })
      .filter((o) => o.label && o.url)
      .slice(0, OTHER_PLATFORM_SLOTS),
  }
}

export type PlatformLink = { id: string; label: string; url: string; platform: PodcastPlatform | null }

/** The links to show, in order: the platforms with a logo that have a link, then the other platforms */
export function platformLinks(banner: PodcastBanner): PlatformLink[] {
  return [
    ...PODCAST_PLATFORMS.filter((p) => banner.links[p]).map((p) => ({ id: p, label: PODCAST_PLATFORM_LABELS[p], url: banner.links[p], platform: p as PodcastPlatform | null })),
    ...banner.others.map((o, i) => ({ id: `other-${i}`, label: o.label, url: o.url, platform: null })),
  ]
}
