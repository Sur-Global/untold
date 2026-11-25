/**
 * Saves hand-written translations (made without DeepL) of the CAVI article and the Mariana Alegre interview.
 *
 * Input: JSON files built from the Spanish text by scripts/lib/translate-blocks.ts (see the scratchpad build.py of 2026-10-30).
 * Safe by design: it stops if the Spanish original changed since the translations were written, never overwrites a row that
 * somebody wrote or edited by hand (except the listed corrections to the existing interview), and saves with
 * is_auto_translated = false so the automatic translator never overwrites them.
 *
 * Run: npx tsx --env-file=.env.local scripts/save-hand-translations.ts <folder with the JSON files> [--dry]
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { applyUnits, collectUnits, inlineToMarkup, markupToInline } from './lib/translate-blocks'

const CAVI = '8b26aa29-3ac5-48cb-82bc-641031ac0bfa'
const MARIANA = 'c7a3ed10-772e-43c3-aced-b348c1b16cf6'

const dir = process.argv[2]
const dry = process.argv.includes('--dry')
const read = (f: string) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

async function row(contentId: string, locale: string) {
  const { data } = await sb.from('content_translations').select('*').eq('content_id', contentId).eq('locale', locale).maybeSingle()
  return data as any
}

function setAt(root: any, path: string, value: unknown) {
  const parts = path.split('.')
  let cur = root
  for (let i = 0; i < parts.length - 1; i++) cur = Array.isArray(cur) ? cur[Number(parts[i])] : cur[parts[i]]
  const last = parts[parts.length - 1]
  if (Array.isArray(cur)) cur[Number(last)] = value
  else cur[last] = value
}

async function main() {
  // 1. the converters must round-trip the real bodies exactly, and the Spanish originals must be what was translated
  const sources: Record<string, any> = { cavi: await row(CAVI, 'es'), mariana: await row(MARIANA, 'es') }
  const written: Record<string, any[]> = { cavi: read('cavi-es.units.json'), mariana: read('mariana-es.units.json') }
  for (const key of ['cavi', 'mariana']) {
    const units = collectUnits(sources[key].body)
    if (JSON.stringify(units.map((u) => u.markup)) !== JSON.stringify(written[key].map((u) => u.markup))) {
      throw new Error(`The Spanish text of "${key}" changed since it was translated: translations not saved.`)
    }
    for (const u of units) if (u.kind === 'inline' && inlineToMarkup(markupToInline(u.markup)) !== u.markup) throw new Error(`mark-up does not round-trip: ${u.markup.slice(0, 60)}`)
  }
  console.log('✓ Spanish originals unchanged; mark-up round-trips')

  const jobs: { label: string; contentId: string; locale: string; data: any }[] = []

  // 2. new translations of the CAVI article (en, pt, fr) and of the interview (fr)
  for (const [key, contentId, locale, file] of [
    ['cavi', CAVI, 'en', 'out-cavi-en.json'],
    ['cavi', CAVI, 'pt', 'out-cavi-pt.json'],
    ['cavi', CAVI, 'fr', 'out-cavi-fr.json'],
    ['mariana', MARIANA, 'fr', 'out-mariana-fr.json'],
  ] as const) {
    const existing = await row(contentId, locale)
    if (existing) throw new Error(`${key}/${locale} already exists: not overwriting`)
    const t = read(file)
    const src = sources[key]
    const units = collectUnits(src.body)
    const body = applyUnits(src.body, units, t.units)
    jobs.push({
      label: `${key}/${locale} (new)`,
      contentId,
      locale,
      data: { title: t.title, excerpt: t.excerpt ?? null, featured_summary: t.featured_summary ?? null, body, is_auto_translated: false, needs_review: false },
    })
  }

  // 3. corrections to the English and Portuguese versions of the interview that already exist
  const esUnits = collectUnits(sources.mariana.body)
  for (const locale of ['en', 'pt']) {
    const existing = await row(MARIANA, locale)
    if (!existing) throw new Error(`mariana/${locale} not found`)
    const fix = read(`out-mariana-${locale}-fix.json`)
    const body = JSON.parse(JSON.stringify(existing.body))
    for (const [i, text] of Object.entries<string>(fix.fixes)) setAt(body, esUnits[Number(i)].path, markupToInline(text))
    jobs.push({ label: `mariana/${locale} (corrections)`, contentId: MARIANA, locale, data: { body, featured_summary: fix.featured_summary } })
  }

  for (const j of jobs) {
    const n = collectUnits(j.data.body).length
    console.log(`${j.dry ? '' : ''}${j.label}: ${n} text units${j.data.title ? `, title “${j.data.title}”` : ''}`)
  }
  if (dry) return console.log('(dry run: nothing saved)')

  for (const j of jobs) {
    const existing = await row(j.contentId, j.locale)
    const { error } = existing
      ? await sb.from('content_translations').update(j.data).eq('id', existing.id)
      : await sb.from('content_translations').insert({ content_id: j.contentId, locale: j.locale, ...j.data })
    if (error) throw new Error(`${j.label}: ${error.message}`)
    console.log('✓ saved', j.label)
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
