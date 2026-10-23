import type { Metadata } from 'next'

export const SITE_NAME = 'UNTOLD.ink'
/** 1200×630 picture used when a page has none of its own */
export const DEFAULT_SHARE_IMAGE = '/og-default.png'

/** Where the site lives: addresses of share pictures and links are built from it */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/+$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return vercel ? `https://${vercel}` : 'http://localhost:3000'
}

const OG_LOCALE: Record<string, string> = { en: 'en_US', es: 'es_ES', pt: 'pt_PT', fr: 'fr_FR', de: 'de_DE', da: 'da_DK' }

/** The address of a page in a language: English has no prefix */
export function localizedPath(locale: string, path: string): string {
  return locale === 'en' ? path : `/${locale}${path}`
}

/**
 * What social networks, WhatsApp and search engines read to show a shared link: title, summary and picture.
 * `image` is an absolute address (or a path of this site).
 */
export function contentMetadata({
  locale, path, title, description, image, kind = 'article', publishedAt, authorName,
}: {
  locale: string
  path: string
  title: string
  description?: string | null
  image?: string | null
  kind?: 'article' | 'website'
  publishedAt?: string | null
  authorName?: string | null
}): Metadata {
  const url = localizedPath(locale, path)
  const picture = image || DEFAULT_SHARE_IMAGE
  const summary = description?.trim() || undefined
  return {
    title: `${title} — UNTOLD`,
    description: summary,
    alternates: { canonical: url },
    openGraph: {
      type: kind,
      siteName: SITE_NAME,
      title,
      description: summary,
      url,
      locale: OG_LOCALE[locale] ?? locale,
      images: [{ url: picture, alt: title }],
      ...(kind === 'article' && publishedAt ? { publishedTime: publishedAt } : {}),
      ...(kind === 'article' && authorName ? { authors: [authorName] } : {}),
    },
    twitter: { card: 'summary_large_image', title, description: summary, images: [picture] },
  }
}
