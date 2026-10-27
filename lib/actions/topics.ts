'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'
import { SUPPORTED_LOCALES, translateTexts, type SupportedLocale } from '@/lib/deepl'
import { TOPIC_DESCRIPTION_MAX, cleanTopicImage } from '@/lib/topics'

export type SetTopicResult = { ok: true } | { ok: false; error: string }

/** Makes a tag one of the topics of the site (or a plain tag again). Admins only. */
export async function setTagTopic(tagId: string, isTopic: boolean): Promise<SetTopicResult> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await (supabase as any).from('tags').update({ is_topic: !!isTopic }).eq('id', tagId)
  if (error) return { ok: false, error: error.message ?? 'Could not save' }
  // topics show in the listings, on every piece of content and on /topics
  revalidatePath('/', 'layout')
  return { ok: true }
}

export type SaveTopicDetailsResult = { ok: true; translated: boolean } | { ok: false; error: string }

/**
 * The sentence (in Spanish) and the picture of a topic's page. The sentence is translated to the other languages;
 * if the translator is not available the Spanish one is kept and shown meanwhile. Admins only.
 */
export async function saveTopicDetails(tagId: string, input: { description: string; imageUrl: string }): Promise<SaveTopicDetailsResult> {
  await requireAdmin()
  const description = (input.description ?? '').trim().slice(0, TOPIC_DESCRIPTION_MAX)
  const imageUrl = cleanTopicImage(input.imageUrl)
  const supabase = await createClient()

  const descriptions: Record<string, string> = {}
  let translated = true
  if (description) {
    descriptions.es = description
    for (const locale of SUPPORTED_LOCALES.filter((l) => l !== 'es') as SupportedLocale[]) {
      try {
        descriptions[locale] = (await translateTexts([description], locale, 'es'))[0]
      } catch (err) {
        console.error(`[topics] could not translate the description to ${locale}:`, err)
        translated = false
      }
    }
  }

  const { error } = await (supabase as any).from('tags').update({ descriptions, image_url: imageUrl }).eq('id', tagId)
  if (error) return { ok: false, error: error.message ?? 'Could not save' }
  revalidatePath('/', 'layout')
  return { ok: true, translated }
}
