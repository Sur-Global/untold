'use server'

import { requireAdmin } from '@/lib/require-admin'
import { SUPPORTED_LOCALES } from '@/lib/deepl'

export async function retranslate(contentId: string, locale: string): Promise<void> {
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    throw new Error(`Unsupported locale: ${locale}`)
  }
  await requireAdmin()

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
    },
    body: JSON.stringify({ contentId, locale }),
  })

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error((json as any).error ?? `Translation failed: ${res.status}`)
  }
}
