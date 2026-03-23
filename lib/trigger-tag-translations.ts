export async function triggerTagTranslations(locale: string): Promise<void> {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate-tags`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
      },
      body: JSON.stringify({ locale }),
    })
  } catch (err) {
    console.error(`[tag-translation] failed for locale ${locale}:`, err)
  }
}
