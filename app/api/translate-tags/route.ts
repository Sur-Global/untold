import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { translateTexts, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/deepl'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-translate-secret')
  if (!secret || secret !== process.env.TRANSLATE_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { locale } = body as { locale?: string }

  if (!locale || !(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return NextResponse.json({ error: 'Unsupported locale' }, { status: 400 })
  }

  const targetLocale = locale as SupportedLocale
  const supabase = createServiceRoleClient()

  // Fetch all tags that are missing the target locale in their names
  const { data: tags } = await (supabase as any)
    .from('tags')
    .select('id, names')

  // A tag is translated from English when it has an English name, otherwise from the language it was written in
  const sourceOf = (names: Record<string, string> | null): string | null => {
    if (names?.en) return 'en'
    return (SUPPORTED_LOCALES as readonly string[]).find((l) => names?.[l]) ?? null
  }
  const missing = (tags ?? []).filter((tag: any) => !tag.names?.[targetLocale] && sourceOf(tag.names))

  if (missing.length === 0) {
    return NextResponse.json({ ok: true, translated: 0 })
  }

  const bySource = new Map<string, any[]>()
  for (const tag of missing) {
    const source = sourceOf(tag.names)!
    bySource.set(source, [...(bySource.get(source) ?? []), tag])
  }

  for (const [source, group] of bySource) {
    const translatedNames = await translateTexts(group.map((tag: any) => tag.names[source]), targetLocale, source)
    // Update each tag with the new locale name
    await Promise.all(
      group.map((tag: any, i: number) =>
        (supabase as any)
          .from('tags')
          .update({ names: { ...tag.names, [targetLocale]: translatedNames[i] } })
          .eq('id', tag.id)
      )
    )
  }

  return NextResponse.json({ ok: true, translated: missing.length })
}
