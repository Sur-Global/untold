/** The two advertising banners on the homepage (set in Admin → Advertising). */
export type BannerSlot = 'top' | 'bottom'
export const BANNER_SLOTS: BannerSlot[] = ['top', 'bottom']

export type HomeBanner = {
  /** switched off = nothing is shown */
  enabled: boolean
  /** wide picture; empty = UNTOLD's own promo design */
  imageUrl: string
  /** optional picture for phones (a taller crop of the same ad) */
  mobileImageUrl: string
  /** where a click goes: https://…, /internal-page or mailto:…; empty = not clickable */
  linkUrl: string
  /** describes the picture for people who cannot see it */
  altText: string
  /** advertiser name, shown next to the “Advertisement” label */
  sponsor: string
  /** show the small “Advertisement” label above the banner */
  showLabel: boolean
}

export type HomeBanners = Record<BannerSlot, HomeBanner>

export const DEFAULT_BANNER: HomeBanner = {
  enabled: true,
  imageUrl: '',
  mobileImageUrl: '',
  linkUrl: '',
  altText: '',
  sponsor: '',
  showLabel: false,
}

export const DEFAULT_HOME_BANNERS: HomeBanners = {
  top: { ...DEFAULT_BANNER },
  bottom: { ...DEFAULT_BANNER },
}

/** Only these kinds of addresses are allowed in a banner link — never javascript: or data: */
export function safeBannerLink(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value || value.length > 2000) return ''
  if (/^\/(?!\/)/.test(value)) return value
  if (/^https?:\/\/[^\s]+$/i.test(value)) return value
  if (/^mailto:[^\s]+$/i.test(value)) return value
  return ''
}

function safeImageUrl(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim() : ''
  return /^https?:\/\/[^\s]+$/i.test(value) && value.length <= 2000 ? value : ''
}

function text(raw: unknown, max: number): string {
  return typeof raw === 'string' ? raw.trim().slice(0, max) : ''
}

export function normalizeBanner(raw: unknown): HomeBanner {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : DEFAULT_BANNER.enabled,
    imageUrl: safeImageUrl(r.imageUrl),
    mobileImageUrl: safeImageUrl(r.mobileImageUrl),
    linkUrl: safeBannerLink(r.linkUrl),
    altText: text(r.altText, 200),
    sponsor: text(r.sponsor, 80),
    showLabel: typeof r.showLabel === 'boolean' ? r.showLabel : DEFAULT_BANNER.showLabel,
  }
}

export function normalizeHomeBanners(raw: unknown): HomeBanners {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return { top: normalizeBanner(r.top), bottom: normalizeBanner(r.bottom) }
}

export const isExternalLink = (url: string) => /^https?:\/\//i.test(url)
