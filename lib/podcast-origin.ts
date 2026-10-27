// Where a podcast comes from. Admins and editors choose it; the podcast of anyone else is third-party.
// Order = the order of the sections on the podcasts page.

export const PODCAST_ORIGINS = ['own', 'collab', 'guest', 'third_party'] as const
export type PodcastOrigin = (typeof PODCAST_ORIGINS)[number]

export const DEFAULT_PODCAST_ORIGIN: PodcastOrigin = 'third_party'

export const PODCAST_ORIGIN_REQUIRED_MESSAGE = 'Choose the type of podcast before publishing.'

export function isPodcastOrigin(value: unknown): value is PodcastOrigin {
  return typeof value === 'string' && (PODCAST_ORIGINS as readonly string[]).includes(value)
}

/** The type chosen in a form, or null when it has none (or something that is not a type) */
export function readPodcastOrigin(formData: FormData): PodcastOrigin | null {
  const value = formData.get('origin')
  return isPodcastOrigin(value) ? value : null
}

/**
 * What to store when a podcast is created: the type an admin/editor chose (nothing yet is allowed for a draft,
 * not for a podcast that is published right away), and third-party for anyone else.
 */
export function originForNewPodcast({ isEditor, formData, publishing }: { isEditor: boolean; formData: FormData; publishing: boolean }): PodcastOrigin | null {
  if (!isEditor) return DEFAULT_PODCAST_ORIGIN
  const origin = readPodcastOrigin(formData)
  if (!origin && publishing) throw new Error(PODCAST_ORIGIN_REQUIRED_MESSAGE)
  return origin
}

/** What to change when a podcast is saved: a type only an admin/editor chose; undefined = leave it as it is */
export function originForSavedPodcast({ isEditor, formData }: { isEditor: boolean; formData: FormData }): PodcastOrigin | undefined {
  return isEditor ? readPodcastOrigin(formData) ?? undefined : undefined
}

/** The messages key of a type: its heading on the podcasts page and its option in the form */
export const PODCAST_ORIGIN_KEYS: Record<PodcastOrigin, string> = {
  own: 'podcastOriginOwn',
  collab: 'podcastOriginCollab',
  guest: 'podcastOriginGuest',
  third_party: 'podcastOriginThirdParty',
}

/** The short label on a card; the third-party podcast (the usual one) has none */
export const PODCAST_BADGE_KEYS: Partial<Record<PodcastOrigin, string>> = {
  own: 'podcastBadgeOwn',
  collab: 'podcastBadgeCollab',
  guest: 'podcastBadgeGuest',
}

/** The label of a podcast's card: the short name of its type, or null when it has none to show */
export function podcastBadgeLabel(origin: unknown, t: (key: string) => string): string | null {
  const key = isPodcastOrigin(origin) ? PODCAST_BADGE_KEYS[origin] : undefined
  return key ? t(key) : null
}
