// Asks the translator (the /api/translate route) to translate a piece of content, and tells what went wrong in words.

export async function assertTranslateSuccess(res: Response): Promise<void> {
  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error((json as any).error ?? `Translation failed: ${res.status}`)
  }

  // The API returns 200 even when individual locales failed (so partial
  // success — e.g. 2 of 5 locales — isn't reported as a hard error), so we
  // still need to check the body for a quota-vs-generic-failure distinction.
  if ((json as any).quotaExceeded) {
    throw new Error('DeepL translation quota exceeded — check your plan or wait for it to reset before retrying.')
  }
  const failed: string[] = (json as any).failed ?? []
  if (failed.length > 0) {
    throw new Error(`Translation failed for: ${failed.join(', ')}`)
  }
}

/** Translates `contentId` into `locale` (into every active language when there is no `locale`) */
export async function requestTranslation(contentId: string, locale?: string): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
    },
    body: JSON.stringify(locale ? { contentId, locale } : { contentId }),
  })
  await assertTranslateSuccess(res)
}
