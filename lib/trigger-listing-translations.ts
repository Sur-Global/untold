/**
 * Trigger background translation of title/excerpt/description for content items
 * that don't yet have a translation row for the given locale.
 *
 * Uses fieldsOnly=true so only short text fields are translated (no body/transcript).
 * Called via after() so it never blocks page rendering.
 */
export async function triggerListingTranslations(
  contentIds: string[],
  locale: string,
): Promise<void> {
  if (!contentIds.length) return
  for (const contentId of contentIds) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
        },
        body: JSON.stringify({ contentId, locale, fieldsOnly: true }),
      })
    } catch (err) {
      console.error(`[listing-translation] failed for ${contentId}:`, err)
    }
  }
}
