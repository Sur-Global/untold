import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SUPPORTED_LOCALES } from '@/lib/deepl'
import { slugify } from '@/lib/utils'
import { tagDisplayName, tagSlugFor } from '@/lib/tag-name'

/** Tag suggestions for the tags input: found by their name in the person's language, in English, or by their slug, and shown in their language */
export async function GET(req: NextRequest) {
  const asked = req.nextUrl.searchParams.get('locale') ?? 'en'
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(asked) ? asked : 'en'
  // characters that mean something inside a filter are not part of a search
  const q = (req.nextUrl.searchParams.get('q') ?? '').replace(/[,()%*\\"]/g, ' ').trim()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })
  if (!q) return NextResponse.json([])

  const slug = tagSlugFor(q, slugify)
  const filters = [
    ...(slug ? [`slug.ilike.%${slug}%`] : []),
    `names->>${locale}.ilike.%${q}%`,
    ...(locale === 'en' ? [] : [`names->>en.ilike.%${q}%`]),
  ]
  const { data: tags } = await (supabase as any)
    .from('tags')
    .select('id, slug, names')
    .or(filters.join(','))
    .limit(10)

  return NextResponse.json(
    (tags ?? []).map((t: any) => ({ id: t.id, slug: t.slug, name: tagDisplayName(t.names, locale, t.slug) }))
  )
}
