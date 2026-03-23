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

  const missing = (tags ?? []).filter(
    (tag: any) => tag.names?.en && !tag.names?.[targetLocale]
  )

  if (missing.length === 0) {
    return NextResponse.json({ ok: true, translated: 0 })
  }

  const englishNames: string[] = missing.map((tag: any) => tag.names.en)
  const translatedNames = await translateTexts(englishNames, targetLocale)

  // Update each tag with the new locale name
  await Promise.all(
    missing.map((tag: any, i: number) =>
      (supabase as any)
        .from('tags')
        .update({ names: { ...tag.names, [targetLocale]: translatedNames[i] } })
        .eq('id', tag.id)
    )
  )

  return NextResponse.json({ ok: true, translated: missing.length })
}
