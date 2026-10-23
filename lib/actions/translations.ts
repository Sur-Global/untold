'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { requireCreator } from '@/lib/require-creator'
import { isEditorRole } from '@/lib/require-editor'
import { SUPPORTED_LOCALES } from '@/lib/deepl'
import { parseSlides, SLIDE_TEXT_MAX } from '@/lib/pill-slides'
import { translatableFields, summaryColumn } from '@/lib/translation-editor'
import { requestTranslation } from '@/lib/translate-call'
import { stripNewMediaBlocks } from '@/lib/body-policy'

export type TranslationInput = { title: string; summary?: string; body?: unknown; slides?: { id: string; text: string }[] }

/** Loads the content and checks the person may translate it: its author, or an admin or editor */
async function authorize(contentId: string, locale: string) {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) throw new Error(`Unsupported locale: ${locale}`)
  const { user, profile } = await requireCreator()
  const supabase = await createClient()
  const { data: content } = await (supabase as any)
    .from('content')
    .select('id, type, author_id, source_locale, single_language')
    .eq('id', contentId)
    .maybeSingle()
  if (!content || !['pill', 'video', 'podcast', 'course'].includes(content.type)) throw new Error('Content not found')
  if (!isEditorRole(profile.role) && content.author_id !== user.id) throw new Error('You can only translate your own content')
  if (locale === (content.source_locale ?? 'en')) throw new Error('That is the original language')
  return { supabase, content }
}

/**
 * Saves a translation written or corrected by hand. It is protected: the automatic translator never touches it again
 * (until "translate automatically again"), and it no longer needs review.
 */
export async function saveTranslation(contentId: string, locale: string, input: TranslationInput): Promise<void> {
  const { supabase, content } = await authorize(contentId, locale)

  const title = (input.title ?? '').trim().slice(0, 300)
  if (!title) throw new Error('A translation needs a title')

  const { data: meta } = content.type === 'pill'
    ? await (supabase as any).from('pill_meta').select('format, slides, slide_translations').eq('content_id', contentId).maybeSingle()
    : { data: null }
  const carousel = meta?.format === 'carousel'
  const fields = translatableFields(content.type, carousel, !!content.single_language)
  const column = summaryColumn(content.type, carousel)

  const values: Record<string, unknown> = { content_id: contentId, locale, title, is_auto_translated: false, needs_review: false }
  if (fields.summary && column) values[column] = (input.summary ?? '').trim().slice(0, column === 'excerpt' ? 600 : 5000) || null
  if (fields.body && input.body !== undefined) {
    if (input.body !== null && !Array.isArray(input.body)) throw new Error('Invalid text')
    const { data: current } = await (supabase as any).from('content_translations').select('body').eq('content_id', contentId).eq('locale', locale).maybeSingle()
    values.body = content.type === 'pill' ? stripNewMediaBlocks(input.body, current?.body) : input.body
  }

  const { error } = await (supabase as any).from('content_translations').upsert(values, { onConflict: 'content_id,locale' })
  if (error) throw new Error(error.message ?? 'Could not save the translation')

  if (fields.slides && input.slides) {
    const valid = new Set(parseSlides(meta?.slides).map((slide) => slide.id))
    const texts = input.slides
      .filter((slide) => valid.has(slide.id) && typeof slide.text === 'string' && slide.text.trim())
      .map((slide) => ({ id: slide.id, text: slide.text.trim().slice(0, Math.round(SLIDE_TEXT_MAX * 1.5)) }))
    const { error: slidesError } = await (supabase as any)
      .from('pill_meta')
      .update({ slide_translations: { ...(meta?.slide_translations ?? {}), [locale]: texts } })
      .eq('content_id', contentId)
    if (slidesError) throw new Error(slidesError.message ?? 'Could not save the slide texts')
  }

  revalidatePath(`/dashboard`)
}

/** The original changed after a translation was corrected, and the translation is fine as it is: it is not flagged any more */
export async function markTranslationReviewed(contentId: string, locale: string): Promise<void> {
  const { supabase } = await authorize(contentId, locale)
  const { error } = await (supabase as any).from('content_translations').update({ needs_review: false }).eq('content_id', contentId).eq('locale', locale)
  if (error) throw new Error(error.message ?? 'Could not update the translation')
}

/**
 * Throws away what was corrected by hand in one language and translates it automatically again (also used to create a
 * translation that does not exist yet).
 */
export async function translateAgain(contentId: string, locale: string): Promise<void> {
  const { content } = await authorize(contentId, locale)
  const service = createServiceRoleClient() as any

  // The row is deleted, so the translator makes it again from the original
  await service.from('content_translations').delete().eq('content_id', contentId).eq('locale', locale)
  if (content.type === 'pill') {
    const { data: meta } = await service.from('pill_meta').select('slide_translations').eq('content_id', contentId).maybeSingle()
    if (meta?.slide_translations?.[locale]) {
      const { [locale]: _dropped, ...rest } = meta.slide_translations
      await service.from('pill_meta').update({ slide_translations: Object.keys(rest).length > 0 ? rest : null }).eq('content_id', contentId)
    }
  }

  await requestTranslation(contentId, locale)
  revalidatePath(`/dashboard`)
}
