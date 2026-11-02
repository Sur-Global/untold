import type { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'
import { siteUrl } from '@/lib/content-metadata'

/** Pages for people who work on the site or for one visitor only: not for search engines (in every language) */
const PRIVATE = ['/admin', '/dashboard', '/create', '/auth', '/suspended', '/search']

export default function robots(): MetadataRoute.Robots {
  const prefixes = routing.locales.filter((l) => l !== routing.defaultLocale)
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', ...PRIVATE, ...prefixes.flatMap((l) => PRIVATE.map((p) => `/${l}${p}`))],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
