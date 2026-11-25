/**
 * Renames the interview series in the ENGLISH texts: "Maps of Deviation" / "Maps of the Detour" / "Cartographies of Deviation"
 * → "Cartographies of the Detour" (the Spanish "Cartografías del Desvío"). Only the series name changes; other words such as
 * "detours" in unrelated sentences are left alone. Saves a backup of every row it touches.
 *
 * Run: npx tsx --env-file=.env.local scripts/rename-series-en.ts <backup file.json> [--apply]
 */
import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const NAME = 'Cartographies of the Detour'
const SERIES = /\b(?:Maps?|Cartographies|Cartography|Mapping)\s+(?:of\s+)?(?:the\s+)?(?:Deviation|Detour)s?\b/gi
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

const fix = (s: string) => s.replace(SERIES, NAME)

/** replaces inside every string of a body; reports a series name that is cut between two styled pieces of text */
function fixBody(node: any, splitFound: string[]): any {
  if (typeof node === 'string') return fix(node)
  if (Array.isArray(node)) {
    // a run of inline text pieces: look for the name across the pieces
    if (node.length > 1 && node.every((n) => n && typeof n === 'object')) {
      const joined = node.map((n: any) => (typeof n.text === 'string' ? n.text : '\u0000')).join('')
      const whole = (joined.match(SERIES) ?? []).length
      const inPieces = node.reduce((n: number, p: any) => n + (typeof p.text === 'string' ? (p.text.match(SERIES) ?? []).length : 0), 0)
      if (whole > inPieces) splitFound.push(joined.slice(0, 120))
    }
    return node.map((n) => fixBody(n, splitFound))
  }
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, fixBody(v, splitFound)]))
  return node
}

async function main() {
  const apply = process.argv.includes('--apply')
  const { data: rows } = await sb.from('content_translations').select('id,content_id,title,excerpt,featured_summary,description,body').eq('locale', 'en')
  const changes: { row: any; patch: Record<string, unknown>; shown: string[] }[] = []
  const split: string[] = []
  for (const r of rows ?? []) {
    const patch: Record<string, unknown> = {}
    const shown: string[] = []
    for (const f of ['title', 'excerpt', 'featured_summary', 'description'] as const) {
      if (typeof r[f] === 'string' && fix(r[f]) !== r[f]) { patch[f] = fix(r[f]); shown.push(`${f}: ${r[f].slice(0, 70)}  →  ${(patch[f] as string).slice(0, 70)}`) }
    }
    if (r.body) {
      const next = fixBody(r.body, split)
      if (JSON.stringify(next) !== JSON.stringify(r.body)) { patch.body = next; shown.push('body: ' + (JSON.stringify(r.body).match(SERIES) ?? []).length + ' mention(s)') }
    }
    if (Object.keys(patch).length) changes.push({ row: r, patch, shown })
  }
  for (const c of changes) console.log(c.row.content_id.slice(0, 8), c.shown.join(' | '))
  console.log(`${changes.length} English rows change; series name split between styled pieces of text (not auto-fixed): ${split.length}`, split)
  if (!apply) return console.log('(dry run: nothing saved)')
  writeFileSync(process.argv[2], JSON.stringify(changes.map((c) => c.row), null, 1))
  for (const c of changes) {
    const { error } = await sb.from('content_translations').update(c.patch).eq('id', c.row.id)
    if (error) throw new Error(`${c.row.id}: ${error.message}`)
  }
  console.log('✓ saved; backup in', process.argv[2])
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
