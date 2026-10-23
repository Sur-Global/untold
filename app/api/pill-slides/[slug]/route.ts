import { NextRequest, NextResponse } from 'next/server'
import { zipSync } from 'fflate'
import { createClient } from '@/lib/supabase/server'
import { SUPPORTED_LOCALES } from '@/lib/deepl'
import { localizedSlides, parseSlides } from '@/lib/pill-slides'
import { renderSlideImage } from '@/lib/pill-slide-image'

// Drawing ten pictures takes a few seconds
export const maxDuration = 60

/**
 * The slides of a published carousel pill as pictures: `?n=3` is the third slide (JPEG), without it all of them in a ZIP.
 * `?locale=es` draws the texts in that language (where they are translated).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const asked = req.nextUrl.searchParams.get('locale') ?? ''
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(asked) ? asked : null
  const n = Number(req.nextUrl.searchParams.get('n') ?? '')

  const supabase = await createClient()
  const { data: pill } = await (supabase as any)
    .from('content')
    .select('slug, source_locale, pill_meta ( format, slides, slide_translations )')
    .eq('slug', slug)
    .eq('type', 'pill')
    .eq('status', 'published')
    .single()
  const meta = Array.isArray(pill?.pill_meta) ? pill.pill_meta[0] : pill?.pill_meta
  if (!pill || meta?.format !== 'carousel') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const sourceLocale: string = pill.source_locale ?? 'en'
  const { slides } = localizedSlides(parseSlides(meta.slides), meta.slide_translations, locale ?? sourceLocale, sourceLocale)
  if (slides.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const headers = { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600' }
  const name = (i: number) => `${slug}-${String(i + 1).padStart(2, '0')}.jpg`

  if (Number.isInteger(n) && n >= 1) {
    if (n > slides.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const image = await renderSlideImage(slides[n - 1])
    return new NextResponse(new Uint8Array(image), {
      headers: { ...headers, 'Content-Type': 'image/jpeg', 'Content-Disposition': `inline; filename="${name(n - 1)}"` },
    })
  }

  const images = await Promise.all(slides.map((slide) => renderSlideImage(slide)))
  const zip = zipSync(Object.fromEntries(images.map((image, i) => [name(i), new Uint8Array(image)])), { level: 0 })
  return new NextResponse(new Uint8Array(zip), {
    headers: { ...headers, 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${slug}-laminas.zip"` },
  })
}
