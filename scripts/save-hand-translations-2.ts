/**
 * Saves the hand-written translations (en, pt, fr) of Óscar Pastor's article and of the issue's editorial.
 * Same safeguards as save-hand-translations.ts: stops if the Spanish original changed since it was translated, never
 * overwrites an existing row, saves with is_auto_translated = false so the automatic translator leaves them alone.
 *
 * Run: npx tsx --env-file=.env.local scripts/save-hand-translations-2.ts <folder with the JSON files> [--dry]
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { applyUnits, collectUnits, inlineToMarkup, markupToInline } from './lib/translate-blocks'

const OSCAR = '90830014-ecca-40c1-9f33-958655b63463'
const EDITORIAL = 'e435c398-93b3-416e-b88b-db6bf71e265e'
const dir = process.argv[2]
const dry = process.argv.includes('--dry')
const read = (f: string) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

async function row(contentId: string, locale: string) {
  const { data } = await sb.from('content_translations').select('*').eq('content_id', contentId).eq('locale', locale).maybeSingle()
  return data as any
}

async function main() {
  const items = [
    { key: 'oscar', id: OSCAR, units: 'oscar-es.units.json' },
    { key: 'editorial', id: EDITORIAL, units: 'editorial-es.units.json' },
  ]
  const jobs: { label: string; id: string; locale: string; data: any }[] = []
  for (const it of items) {
    const src = await row(it.id, 'es')
    const units = collectUnits(src.body)
    const written = read(it.units)
    if (JSON.stringify(units.map((u) => u.markup)) !== JSON.stringify(written.map((u: any) => u.markup))) {
      throw new Error(`The Spanish text of "${it.key}" changed since it was translated: nothing saved.`)
    }
    for (const u of units) if (u.kind === 'inline' && inlineToMarkup(markupToInline(u.markup)) !== u.markup) throw new Error(`mark-up does not round-trip in ${it.key}: ${u.markup.slice(0, 60)}`)
    for (const locale of ['en', 'pt', 'fr']) {
      if (await row(it.id, locale)) throw new Error(`${it.key}/${locale} already exists: not overwriting`)
      const t = read(`out-${it.key}-${locale}.json`)
      jobs.push({
        label: `${it.key}/${locale}`,
        id: it.id,
        locale,
        data: { title: t.title, excerpt: t.excerpt ?? null, featured_summary: t.featured_summary ?? null, body: applyUnits(src.body, units, t.units), is_auto_translated: false, needs_review: false },
      })
    }
  }
  // every footnote number must still have its note, in the same order as in the Spanish
  const ids = (blocks: any[]): { marks: string[]; notes: string[] } => {
    const marks: string[] = []
    const notes: string[] = []
    const inline = (items: any) => (Array.isArray(items) ? items : []).forEach((i: any) => i?.type === 'footnoteRef' && marks.push(i.props.id))
    const walk = (bs: any[]) => bs.forEach((b) => {
      if (b.type === 'footnote') notes.push(b.props.ref)
      else if (Array.isArray(b.content)) inline(b.content)
      else (b.content?.rows ?? []).forEach((r: any) => (r.cells ?? []).forEach((c: any) => inline(c.content)))
      if (Array.isArray(b.children)) walk(b.children)
    })
    walk(blocks)
    return { marks, notes }
  }
  const spanish = ids((await row(OSCAR, 'es')).body)
  for (const j of jobs.filter((x) => x.id === OSCAR)) {
    const got = ids(j.data.body)
    if (JSON.stringify(got) !== JSON.stringify(spanish)) throw new Error(`${j.label}: footnote numbers/notes do not match the Spanish`)
  }
  console.log(`✓ footnotes intact (${spanish.marks.length} numbers, ${spanish.notes.length} notes)`)
  console.log('✓ Spanish originals unchanged; mark-up round-trips')
  for (const j of jobs) console.log(`${j.label}: ${collectUnits(j.data.body).length} text units, title “${j.data.title}”`)
  if (dry) return console.log('(dry run: nothing saved)')
  for (const j of jobs) {
    const { error } = await sb.from('content_translations').insert({ content_id: j.id, locale: j.locale, ...j.data })
    if (error) throw new Error(`${j.label}: ${error.message}`)
    console.log('✓ saved', j.label)
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
