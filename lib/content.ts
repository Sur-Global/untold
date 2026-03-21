export interface Translation {
  locale: string
  title: string
  excerpt: string | null
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
