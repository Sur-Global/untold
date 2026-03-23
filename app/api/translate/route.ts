import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { translateTexts, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/deepl'
import { extractTextNodes, injectTextNodes } from '@/lib/tiptap-translate'
import { extractBlockNoteTextNodes, injectBlockNoteTextNodes } from '@/lib/blocknote-translate'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-translate-secret')
  if (!secret || secret !== process.env.TRANSLATE_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { contentId, locale } = body as { contentId?: string; locale?: string }

  if (!contentId) {
    return NextResponse.json({ error: 'contentId required' }, { status: 400 })
  }

  if (locale && !(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return NextResponse.json({ error: 'Unsupported locale' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data: content } = await (supabase as any)
    .from('content')
    .select('type')
    .eq('id', contentId)
    .single()

  const { data: source } = await (supabase as any)
    .from('content_translations')
    .select('title, excerpt, description, body')
    .eq('content_id', contentId)
    .eq('locale', 'en')
    .single()

  if (!content || !source) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 })
  }

  const locales: SupportedLocale[] = locale
    ? [locale as SupportedLocale]
    : [...SUPPORTED_LOCALES]

  const translated: string[] = []

  for (const targetLocale of locales) {
    try {
      // Skip manually authored translations
      const { data: existing } = await (supabase as any)
        .from('content_translations')
        .select('is_auto_translated')
        .eq('content_id', contentId)
        .eq('locale', targetLocale)
        .maybeSingle()

      if (existing && existing.is_auto_translated === false) continue

      // Build field list for this content type
      const fieldNames: string[] = []
      const fieldValues: string[] = []

      if (source.title) { fieldNames.push('title'); fieldValues.push(source.title) }
      if (content.type === 'article' && source.excerpt) {
        fieldNames.push('excerpt'); fieldValues.push(source.excerpt)
      }
      if (['video', 'podcast', 'course'].includes(content.type) && source.description) {
        fieldNames.push('description'); fieldValues.push(source.description)
      }

      const translatedTexts = fieldValues.length > 0
        ? await translateTexts(fieldValues, targetLocale)
        : []

      const translatedFields: Record<string, string> = {}
      fieldNames.forEach((name, i) => { translatedFields[name] = translatedTexts[i] })

      // Translate body for article and pill (supports both BlockNote and legacy Tiptap formats)
      let translatedBody: unknown = null
      const hasBody = ['article', 'pill', 'video', 'podcast', 'course'].includes(content.type)
      if (hasBody && source.body) {
        if (Array.isArray(source.body)) {
          // BlockNote format
          const entries = extractBlockNoteTextNodes(source.body)
          if (entries.length > 0) {
            const bodyTranslations = await translateTexts(entries.map((e) => e.text), targetLocale)
            translatedBody = injectBlockNoteTextNodes(source.body, bodyTranslations, entries)
          } else {
            translatedBody = source.body
          }
        } else {
          // Legacy Tiptap format
          const { texts, paths } = extractTextNodes(source.body)
          if (texts.length > 0) {
            const bodyTranslations = await translateTexts(texts, targetLocale)
            translatedBody = injectTextNodes(source.body, bodyTranslations, paths)
          } else {
            translatedBody = source.body
          }
        }
      }

      const { error: upsertError } = await (supabase as any)
        .from('content_translations')
        .upsert(
          {
            content_id: contentId,
            locale: targetLocale,
            ...translatedFields,
            body: translatedBody,
            is_auto_translated: true,
          },
          { onConflict: 'content_id,locale' },
        )

      if (upsertError) throw upsertError

      translated.push(targetLocale)

      // Translate transcript for video content
      if (content.type === 'video') {
        try {
          const { data: videoMeta } = await (supabase as any)
            .from('video_meta')
            .select('transcript, transcript_translations')
            .eq('content_id', contentId)
            .maybeSingle()

          const sourceCues: Array<{ start: string; text: string }> = Array.isArray(videoMeta?.transcript)
            ? videoMeta.transcript
            : []

          if (sourceCues.length > 0) {
            const texts = sourceCues.map((c) => c.text)
            const translatedTexts = await translateTexts(texts, targetLocale)
            const translatedCues = sourceCues.map((c, i) => ({ start: c.start, text: translatedTexts[i] }))

            // NOTE: This is a read-then-merge-then-write pattern, not atomic.
            // If two visitors arrive simultaneously in different locales (e.g. es and fr),
            // the second write could overwrite the first locale's translation.
            // Worst case: that locale gets re-triggered on the next visit — no data is permanently lost.
            // For a content site, this is an acceptable trade-off.
            const existing = videoMeta?.transcript_translations ?? {}
            const merged = { ...existing, [targetLocale]: translatedCues }

            await (supabase as any)
              .from('video_meta')
              .update({ transcript_translations: merged })
              .eq('content_id', contentId)
          }
        } catch (err) {
          console.error(`Transcript translation failed for locale ${targetLocale}:`, err)
        }
      }
    } catch (err) {
      console.error(`Translation failed for locale ${targetLocale}:`, err)
    }
  }

  return NextResponse.json({ ok: true, translated })
}
