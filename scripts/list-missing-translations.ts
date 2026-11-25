/**
 * Lists the published articles that still lack a translation (title or body) in an active language, newest first,
 * with the number of words to translate. Read-only. Used to plan the hand-translation batches.
 *
 * Run: npx tsx --env-file=.env.local scripts/list-missing-translations.ts [how many rows to show, default 15]
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

function words(body: any): number {
  let n = 0
  const inline = (items: any) => (Array.isArray(items) ? items : []).forEach((i: any) => (typeof i?.text === 'string' ? (n += i.text.split(/\s+/).filter(Boolean).length) : inline(i?.content)))
  const blocks = (bs: any) => (Array.isArray(bs) ? bs : []).forEach((b: any) => {
    if (Array.isArray(b.content)) inline(b.content)
    else (b.content?.rows ?? []).forEach((r: any) => (r.cells ?? []).forEach((c: any) => inline(c.content)))
    blocks(b.children)
  })
  if (Array.isArray(body)) blocks(body)
  else {
    const walk = (x: any) => { if (x?.text) n += x.text.split(/\s+/).filter(Boolean).length; (x?.content ?? []).forEach(walk) }
    walk(body)
  }
  return n
}

async function main() {
  const show = Number(process.argv[2] ?? 15)
  const { data: s } = await sb.from('platform_settings').select('settings').eq('id', 'default').single()
  const enabled: string[] = (s as any).settings.languages.enabled
  const { data: cs } = await sb.from('content').select('id,slug,source_locale,single_language,published_at').eq('status', 'published').eq('type', 'article').order('published_at', { ascending: false })
  const { data: tr } = await sb.from('content_translations').select('content_id,locale,title,body')
  const by: Record<string, Record<string, any>> = {}
  for (const t of tr ?? []) (by[t.content_id] ??= {})[t.locale] = t
  const rows: { slug: string; words: number; missing: string[] }[] = []
  for (const c of cs ?? []) {
    if (c.single_language) continue
    const missing = enabled.filter((l) => l !== c.source_locale && !(by[c.id]?.[l]?.title && by[c.id]?.[l]?.body))
    if (missing.length) rows.push({ slug: c.slug, words: words(by[c.id]?.[c.source_locale]?.body), missing })
  }
  const pairs = rows.reduce((n, r) => n + r.missing.length, 0)
  const toWrite = rows.reduce((n, r) => n + r.words * r.missing.length, 0)
  console.log(`${rows.length} articles missing something · ${pairs} article-language pairs · ~${toWrite} words to write (active languages: ${enabled.join(', ')})`)
  rows.slice(0, show).forEach((r, i) => console.log(`${String(i + 1).padStart(2)}. ${r.slug}  ${r.words} words  missing: ${r.missing.join('/')}`))
}
main().catch((e) => { console.error(e); process.exit(1) })
