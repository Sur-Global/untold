/**
 * Saves the hand-written en / pt-BR / fr translations of "Reclamar el Internet: hacia una web post-ingenua y pluriversal".
 * The existing rows are title-only stubs of the automatic translator (no body): they get title, summary and the full body, saved as
 * hand-written (is_auto_translated = false) so the automatic translator never overwrites them.
 * Stops if the Spanish text changed since it was translated, or if a row already has a body somebody may have written.
 *
 * Run: npx tsx --env-file=.env.local scripts/save-hand-translations-reclamar.ts <folder with es.units.json and out-<locale>.json> [--dry]
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { applyUnits, collectUnits, inlineToMarkup, markupToInline } from './lib/translate-blocks'

const CONTENT = '574ec1f8-f64b-4231-a915-4dd0840a4c6d'
const LOCALES = ['en', 'pt', 'fr']
const dir = process.argv[2]
const dry = process.argv.includes('--dry')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  const { data: es } = await sb.from('content_translations').select('id, title, excerpt, body').eq('content_id', CONTENT).eq('locale', 'es').single()
  if (!es?.body) throw new Error('Spanish text not found')
  const units = collectUnits(es.body as any[])
  const written: { markup: string }[] = JSON.parse(readFileSync(`${dir}/es.units.json`, 'utf8'))
  if (JSON.stringify(units.map((u) => u.markup)) !== JSON.stringify(written.map((u) => u.markup))) {
    throw new Error('The Spanish text changed since it was translated: translations not saved.')
  }
  for (const u of units) if (u.kind === 'inline' && inlineToMarkup(markupToInline(u.markup)) !== u.markup) throw new Error(`mark-up does not round-trip: ${u.markup.slice(0, 60)}`)
  console.log(`✓ Spanish text unchanged (${units.length} text units); mark-up round-trips`)

  const jobs: { locale: string; id: string; data: Record<string, unknown> }[] = []
  for (const locale of LOCALES) {
    const t = JSON.parse(readFileSync(`${dir}/out-${locale}.json`, 'utf8')) as { title: string; excerpt: string; units: string[] }
    const { data: row } = await sb.from('content_translations').select('id, body, is_auto_translated').eq('content_id', CONTENT).eq('locale', locale).single()
    if (!row) throw new Error(`${locale}: row not found`)
    if (row.body) throw new Error(`${locale}: already has a body: not overwriting`)
    const body = applyUnits(es.body as any[], units, t.units)
    jobs.push({ locale, id: row.id, data: { title: t.title, excerpt: t.excerpt, body, is_auto_translated: false, needs_review: false } })
    console.log(`${locale}: “${t.title}” — ${collectUnits(body).length} text units, ${(body as any[]).length} blocks`)
  }
  if (dry) return console.log('(dry run: nothing saved)')
  for (const j of jobs) {
    const { error } = await sb.from('content_translations').update(j.data).eq('id', j.id)
    if (error) throw new Error(`${j.locale}: ${error.message}`)
    console.log('✓ saved', j.locale)
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
