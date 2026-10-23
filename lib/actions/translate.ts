'use server'

import { requireEditor } from '@/lib/require-editor'
import { SUPPORTED_LOCALES } from '@/lib/deepl'
import { requestTranslation } from '@/lib/translate-call'

export async function retranslateAll(contentId: string): Promise<void> {
  await requireEditor()
  await requestTranslation(contentId)
}

export async function retranslate(contentId: string, locale: string): Promise<void> {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`)
  }
  await requireEditor()
  await requestTranslation(contentId, locale)
}
