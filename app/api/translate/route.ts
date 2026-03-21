import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { translateTexts, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/deepl'
import { extractTextNodes, injectTextNodes } from '@/lib/tiptap-translate'

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

      // Translate Tiptap body for article and pill
      let translatedBody: Record<string, unknown> | null = null
      const hasBody = content.type === 'article' || content.type === 'pill'
      if (hasBody && source.body) {
        const { texts, paths } = extractTextNodes(source.body)
        if (texts.length > 0) {
          const bodyTranslations = await translateTexts(texts, targetLocale)
          translatedBody = injectTextNodes(source.body, bodyTranslations, paths) as Record<string, unknown>
        } else {
          translatedBody = source.body
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
    } catch (err) {
      console.error(`Translation failed for locale ${targetLocale}:`, err)
    }
  }

  return NextResponse.json({ ok: true, translated })
}
