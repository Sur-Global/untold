/**
 * Corrects a few passages of a hand-written translation (en / pt / fr) without rebuilding the whole article.
 *
 * Input: a JSON list of patches, e.g.
 *   [ { "unit": 12, "old": "exact words now in the translation", "new": "replacement" },
 *     { "field": "title", "old": "…", "new": "…" } ]
 * `unit` is the position in the list of text units (same numbering as scripts/dump-article-units.ts and scripts/audit-translations.ts);
 * `old` must appear exactly once in that unit's mark-up (**bold**, *italic*, [label](url), {{fn:key}}). `field` can be title or excerpt.
 *
 * Safe by design: only rows written by hand are touched; the row is copied to .claude/backups/translations-<date>/ first; after the
 * patch every unit must still have the same links and note markers as its Spanish unit and show no raw mark-up.
 *
 * Run: npx tsx --env-file=.env.local scripts/patch-hand-translation.ts <content id> <locale> <patches.json> [--dry]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { collectUnits, linksOf, markupToInline } from './lib/translate-blocks'

const [contentId, locale, patchFile] = process.argv.slice(2)
const dry = process.argv.includes('--dry')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

type Patch = { unit?: number; field?: 'title' | 'excerpt'; old: string; new: string }

const get = (o: any, path: string) => path.split('.').reduce((c, k) => (Array.isArray(c) ? c[Number(k)] : c[k]), o)
function setAt(root: any, path: string, value: unknown): void {
  const parts = path.split('.')
  let cur = root
  for (let i = 0; i < parts.length - 1; i++) cur = Array.isArray(cur) ? cur[Number(parts[i])] : cur[parts[i]]
  const last = parts[parts.length - 1]
  if (Array.isArray(cur)) cur[Number(last)] = value
  else cur[last] = value
}
const textOf = (items: any[]): string => (items ?? []).map((i) => (i.type === 'link' ? textOf(i.content) : i.text ?? '')).join('')
const fnOf = (items: any[]): string[] => (items ?? []).flatMap((i) => (i.type === 'footnoteRef' ? [String(i.props?.id)] : i.type === 'link' ? fnOf(i.content) : []))

function replaceOnce(text: string, old: string, neu: string, where: string): string {
  const n = text.split(old).length - 1
  if (n !== 1) throw new Error(`${where}: "${old.slice(0, 60)}" appears ${n} times (must be exactly once)`)
  return text.replace(old, () => neu)
}

async function main() {
  if (!contentId || !locale || !patchFile) throw new Error('usage: patch-hand-translation.ts <content id> <locale> <patches.json> [--dry]')
  const patches: Patch[] = JSON.parse(readFileSync(patchFile, 'utf8'))
  const { data: rows } = await sb.from('content_translations').select('*').eq('content_id', contentId).in('locale', ['es', locale])
  const es = rows?.find((r) => r.locale === 'es')
  const tr = rows?.find((r) => r.locale === locale)
  if (!es?.body || !tr?.body) throw new Error('Spanish or translated text not found')
  if (tr.is_auto_translated) throw new Error(`${locale} is an automatic translation: this tool only patches hand-written ones`)

  const body = JSON.parse(JSON.stringify(tr.body))
  const esUnits = collectUnits(es.body as any[])
  const units = collectUnits(body)
  if (units.length !== esUnits.length) throw new Error(`units differ: Spanish ${esUnits.length}, ${locale} ${units.length}`)
  const markups = units.map((u) => u.markup)
  const touched = new Set<number>()
  const fields: Record<string, string | null> = { title: tr.title, excerpt: tr.excerpt }

  for (const p of patches) {
    if (p.field) {
      fields[p.field] = replaceOnce(String(fields[p.field] ?? ''), p.old, p.new, p.field)
    } else {
      if (p.unit === undefined || !units[p.unit]) throw new Error(`no unit ${p.unit}`)
      markups[p.unit] = replaceOnce(markups[p.unit], p.old, p.new, `unit ${p.unit}`)
      touched.add(p.unit)
    }
  }

  for (const i of touched) {
    const u = units[i]
    const next = u.kind === 'caption' ? markups[i] : markupToInline(markups[i])
    // links and note markers must survive; no raw mark-up may be left in the text
    if (u.kind === 'inline') {
      const orig = get(es.body, esUnits[i].path)
      if (JSON.stringify(linksOf(esUnits[i].markup)) !== JSON.stringify(linksOf(markups[i]))) throw new Error(`unit ${i}: links differ from the Spanish`)
      if (JSON.stringify(fnOf(orig)) !== JSON.stringify(fnOf(next as any[]))) throw new Error(`unit ${i}: note markers differ from the Spanish`)
      if (/\*\*|\]\(|\{\{/.test(textOf(next as any[]))) throw new Error(`unit ${i}: raw mark-up left in the text`)
      if (!markups[i].trim() && esUnits[i].markup.trim()) throw new Error(`unit ${i}: empty`)
    }
    setAt(body, u.path, next)
  }

  console.log(`${locale}: ${touched.size} unit(s) and ${Object.keys(patches.filter((p) => p.field).reduce((a, p) => ({ ...a, [p.field!]: 1 }), {})).length} field(s) patched`)
  for (const p of patches) console.log(`  ${p.field ?? 'unit ' + p.unit}: "${p.old.slice(0, 50)}" → "${p.new.slice(0, 50)}"`)
  if (dry) return console.log('(dry run: nothing saved)')

  const dir = `.claude/backups/translations-${new Date().toISOString().slice(0, 10)}`
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const file = `${dir}/${contentId}.${locale}.${Date.now()}.json`
  writeFileSync(file, JSON.stringify(tr, null, 1))
  const { error } = await sb.from('content_translations').update({ title: fields.title, excerpt: fields.excerpt, body }).eq('id', tr.id)
  if (error) throw new Error(error.message)
  console.log(`✓ saved (previous row copied to ${file})`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
