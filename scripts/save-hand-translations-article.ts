/**
 * Saves hand-written translations (en / pt / fr) of one article, made without DeepL.
 *
 * Input: a folder with es.units.json (the Spanish text units the translations were written from, made by
 * scripts/lib/translate-blocks.ts → collectUnits) and out-<locale>.json ({ title, excerpt, units[] }) for each language.
 * Safe by design: it stops if the Spanish text changed since it was translated, never overwrites a translation that somebody
 * wrote by hand, checks that links, note markers and bold / italic survive, and saves with is_auto_translated = false so the
 * automatic translator never overwrites it. Rows that do not exist yet are created.
 *
 * Run: npx tsx --env-file=.env.local scripts/save-hand-translations-article.ts <content id> <folder> [--dry] [--replace-hand]
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { applyUnits, collectUnits, inlineShape, markupToInline } from './lib/translate-blocks'

const [contentId, dir] = process.argv.slice(2)
const dry = process.argv.includes('--dry')
const replaceHand = process.argv.includes('--replace-hand')
const LOCALES = ['en', 'pt', 'fr']
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

const get = (o: any, path: string) => path.split('.').reduce((c, k) => (Array.isArray(c) ? c[Number(k)] : c[k]), o)
const linksOf = (items: any[]): string[] => (items ?? []).flatMap((i) => (i.type === 'link' ? [i.href, ...linksOf(i.content)] : []))
const textOf = (items: any[]): string => (items ?? []).map((i) => (i.type === 'link' ? textOf(i.content) : i.text ?? '')).join('')

async function main() {
  if (!contentId || !dir) throw new Error('usage: save-hand-translations-article.ts <content id> <folder> [--dry] [--replace-hand]')
  const { data: es } = await sb.from('content_translations').select('id, body').eq('content_id', contentId).eq('locale', 'es').single()
  if (!es?.body) throw new Error('Spanish text not found')
  const units = collectUnits(es.body as any[])
  const written: { markup: string }[] = JSON.parse(readFileSync(`${dir}/es.units.json`, 'utf8'))
  if (JSON.stringify(units.map((u) => u.markup)) !== JSON.stringify(written.map((u) => u.markup))) {
    throw new Error('The Spanish text changed since it was translated: translations not saved.')
  }
  // the converters must rebuild every Spanish unit with the same structure (links, note markers, bold, italic)
  for (const u of units) {
    if (u.kind !== 'inline') continue
    const a = JSON.stringify(inlineShape(get(es.body, u.path))), b = JSON.stringify(inlineShape(markupToInline(u.markup)))
    if (a !== b) throw new Error(`mark-up does not rebuild the same structure: ${u.path} ${u.markup.slice(0, 60)}`)
  }
  console.log(`✓ Spanish text unchanged (${units.length} text units); mark-up rebuilds every unit with the same structure`)

  const jobs: { locale: string; id: string | null; data: Record<string, unknown> }[] = []
  for (const locale of LOCALES) {
    const file = `${dir}/out-${locale}.json`
    if (!existsSync(file)) continue
    const t = JSON.parse(readFileSync(file, 'utf8')) as { title: string; excerpt: string | null; units: string[] }
    const body = applyUnits(es.body as any[], units, t.units)
    // every translated unit keeps the links of the Spanish one and shows no raw mark-up
    units.forEach((u, i) => {
      if (u.kind !== 'inline') return
      const orig = get(es.body, u.path), made = get(body, u.path)
      if (JSON.stringify(linksOf(orig)) !== JSON.stringify(linksOf(made))) throw new Error(`${locale} ${u.path}: links differ`)
      if (/\*\*|\]\(|\{\{/.test(textOf(made))) throw new Error(`${locale} ${u.path}: raw mark-up left in the text: ${textOf(made).slice(0, 80)}`)
      if (!t.units[i].trim() && u.markup.trim()) throw new Error(`${locale} ${u.path}: empty translation`)
    })
    const { data: row } = await sb.from('content_translations').select('id, body, is_auto_translated').eq('content_id', contentId).eq('locale', locale).maybeSingle()
    if (row?.body && !row.is_auto_translated && !replaceHand) throw new Error(`${locale}: has a text written by hand: not overwriting (use --replace-hand to replace it)`)
    jobs.push({ locale, id: row?.id ?? null, data: { title: t.title, excerpt: t.excerpt ?? null, body, is_auto_translated: false, needs_review: false } })
    console.log(`${locale}: “${t.title}” — ${collectUnits(body).length} text units, ${(body as any[]).length} blocks — ${row ? (row.body ? 'replaces the existing text' : 'fills the empty row') : 'new row'}`)
  }
  if (dry) return console.log('(dry run: nothing saved)')
  for (const j of jobs) {
    const { error } = j.id
      ? await sb.from('content_translations').update(j.data).eq('id', j.id)
      : await sb.from('content_translations').insert({ content_id: contentId, locale: j.locale, ...j.data })
    if (error) throw new Error(`${j.locale}: ${error.message}`)
    console.log('✓ saved', j.locale)
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
