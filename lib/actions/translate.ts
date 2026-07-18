'use server'

import { requireEditor } from '@/lib/require-editor'
import { SUPPORTED_LOCALES } from '@/lib/deepl'

async function assertTranslateSuccess(res: Response): Promise<void> {
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

export async function retranslateAll(contentId: string): Promise<void> {
  await requireEditor()

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
    },
    body: JSON.stringify({ contentId }),
  })

  await assertTranslateSuccess(res)
}

export async function retranslate(contentId: string, locale: string): Promise<void> {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`)
  }
  await requireEditor()

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
    },
    body: JSON.stringify({ contentId, locale }),
  })

  await assertTranslateSuccess(res)
}
