export interface Translation {
  locale: string
  title: string
  excerpt: string | null
  featured_summary?: string | null
  description: string | null
  body: Record<string, unknown> | null
}

export function getTranslation(
  translations: Translation[],
  requestedLocale: string
): Translation | null {
  if (!translations.length) return null
  return (
    translations.find((t) => t.locale === requestedLocale) ??
    translations.find((t) => t.locale === 'en') ??
    translations[0]
  )
}

const MEDIA_TYPES = ['video', 'podcast']

/**
 * Does this item still lack its card text (title, short description) in the visitor's language? Content marked "only
 * available in this language" has none, except a video or podcast: what is spoken is in one language, but its card has
 * to read in the visitor's language. A course marked that way is never translated, not even its title.
 */
export function needsListingTranslation(
  item: { type?: string | null; single_language?: boolean | null; content_translations?: { locale: string }[] | null },
  locale: string,
): boolean {
  if (item.single_language && !MEDIA_TYPES.includes(item.type ?? '')) return false
  return !(item.content_translations ?? []).some((t) => t.locale === locale)
}
