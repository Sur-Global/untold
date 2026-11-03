/**
 * Read-only audit of hand translations: compares the Spanish body of each article with its en / pt / fr bodies (same blocks, ids, props,
 * links, note markers, bold/italic), runs mechanical checks on every text unit (numbers, links, Spanish left over, straight quotes, French
 * spacing, length), and writes a side-by-side file per language for a human read.
 *
 * Run: npx tsx --env-file=.env.local scripts/audit-translations.ts <out folder> <slug> [<slug> …]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { collectUnits, inlineShape, linksOf } from './lib/translate-blocks'

const [outDir, ...slugs] = process.argv.slice(2)
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const LOCALES = ['en', 'pt', 'fr'] as const

type Block = Record<string, any>

/** non-text skeleton of an inline list: link targets and note markers in order */
function skeleton(items: any[]): string[] {
  const out: string[] = []
  for (const i of items ?? []) {
    if (i.type === 'link') out.push(`link:${i.href}`, ...skeleton(i.content))
    else if (i.type === 'footnoteRef') out.push(`fn:${i.props?.id}`)
  }
  return out
}

function runs(items: any[]): { bold: number; italic: number } {
  const shape = inlineShape(items) as any[]
  let bold = 0
  let italic = 0
  const walk = (s: any[]) => s.forEach((x) => {
    if (x.t === 'text') { if (x.bold) bold++; if (x.italic) italic++ } else if (x.t === 'link') walk(x.content)
  })
  walk(shape)
  return { bold, italic }
}

function diffBlocks(es: Block[], tr: Block[], path: string, issues: string[]) {
  if (es.length !== tr.length) { issues.push(`${path}: ${es.length} blocks in Spanish, ${tr.length} in translation`); return }
  es.forEach((a, i) => {
    const b = tr[i]
    const p = `${path}${i}`
    if (a.type !== b.type) { issues.push(`${p}: type ${a.type} ≠ ${b.type}`); return }
    if (a.id !== b.id) issues.push(`${p}: id differs`)
    const pa = { ...(a.props ?? {}) }
    const pb = { ...(b.props ?? {}) }
    delete pa.caption
    delete pb.caption
    if (JSON.stringify(pa) !== JSON.stringify(pb)) issues.push(`${p} (${a.type}): props differ ${JSON.stringify(pa).slice(0, 160)} ≠ ${JSON.stringify(pb).slice(0, 160)}`)
    if (Array.isArray(a.content) !== Array.isArray(b.content)) issues.push(`${p}: content kind differs`)
    else if (Array.isArray(a.content)) {
      const sa = skeleton(a.content).join('|')
      const sb2 = skeleton(b.content).join('|')
      if (sa !== sb2) issues.push(`${p}: links/notes differ\n      es: ${sa}\n      tr: ${sb2}`)
      const ra = runs(a.content)
      const rb = runs(b.content)
      if (ra.bold !== rb.bold || ra.italic !== rb.italic) issues.push(`${p}: bold/italic runs es ${ra.bold}/${ra.italic} vs tr ${rb.bold}/${rb.italic}`)
    } else if (a.type === 'table') {
      const ra = a.content?.rows ?? []
      const rb = b.content?.rows ?? []
      if (ra.length !== rb.length) issues.push(`${p}: table rows ${ra.length} vs ${rb.length}`)
      ra.forEach((row: any, ri: number) => {
        if ((row.cells ?? []).length !== (rb[ri]?.cells ?? []).length) issues.push(`${p}: table row ${ri} cells differ`)
      })
    }
    const ca = a.children ?? []
    const cb = b.children ?? []
    if (ca.length || cb.length) diffBlocks(ca, cb, `${p}.children.`, issues)
  })
}

const numbers = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/[.,]/g, '')).sort().join(',')
const words = (s: string) => s.replace(/[*_]|\{\{fn:[^}]+\}\}|\]\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean).length
const isBibliography = (s: string) => /\((?:19|20)\d\d[a-z]?\)|https?:\/\/|doi\.org/.test(s)

// Words that exist in Spanish but not in the target language (a hit in a translation means Spanish was left in)
const SPANISH_ONLY: Record<string, RegExp> = {
  en: /\b(los|las|una|unos|unas|pero|también|más|cuando|donde|hacia|según|porque|sobre la|del|muy|sus|desde|entre los)\b/i,
  pt: /\b(los|las|una|unos|unas|pero|también|más|cuando|donde|hacia|según|del|muy|sus|nuestro|nuestra|hay|está|están|esto|todo el|con el|con la)\b/i,
  fr: /\b(los|las|una|unos|unas|pero|también|más|cuando|donde|hacia|según|porque|del|muy|sus|nuestro|nuestra|hay|está|están|esto)\b/i,
}
// Portugal-Portuguese markers (the site is Brazilian)
const PT_PT = /\b(equipa|utilizador(es)?|ecrã|telemóvel|autocarro|facto|rapariga|miúdo|casa de banho|pequeno-almoço|comboio|a fazer|a ler|a ver|a ter|a ser|a pensar|a construir|a trabalhar|vós|consigo mesmo|nós próprios|desporto|telemóveis|ficheiro|sítio|registo|equipas|propósito de|contactar|aceder|aceita-se|gerir|à volta)\b/i

interface Flag { unit: number; msg: string }

function checkUnit(locale: string, es: string, tr: string): string[] {
  const f: string[] = []
  if (!tr.trim()) { f.push('empty'); return f }
  if (JSON.stringify(linksOf(es)) !== JSON.stringify(linksOf(tr))) f.push('links differ')
  if (numbers(es) !== numbers(tr)) f.push(`numbers differ (${numbers(es) || '—'} vs ${numbers(tr) || '—'})`)
  if (es.trim() === tr.trim() && words(es) > 3 && !isBibliography(es)) f.push('identical to Spanish')
  const bib = isBibliography(es)
  const plain = tr.replace(/\]\([^)]*\)/g, ']').replace(/\{\{fn:[^}]+\}\}/g, '')
  if (!bib && SPANISH_ONLY[locale].test(plain)) f.push(`Spanish left? "${plain.match(SPANISH_ONLY[locale])![0]}"`)
  if (locale === 'pt' && PT_PT.test(plain)) f.push(`European Portuguese? "${plain.match(PT_PT)![0]}"`)
  if (/  +/.test(tr.replace(/^\s+|\s+$/g, ''))) f.push('double space')
  if (/\s[,.;](?!\.)/.test(plain) && locale !== 'fr') f.push('space before punctuation')
  if (/\.\.\./.test(tr)) f.push('three dots instead of …')
  if (locale === 'en' || locale === 'fr') {
    if (/[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ]/.test(plain)) f.push('straight apostrophe')
  }
  if (/"/.test(plain)) f.push('straight double quotes')
  const open = (plain.match(/“/g) ?? []).length
  const close = (plain.match(/”/g) ?? []).length
  if (open !== close) f.push(`unbalanced “ ” (${open}/${close})`)
  const fo = (plain.match(/«/g) ?? []).length
  const fc = (plain.match(/»/g) ?? []).length
  if (fo !== fc) f.push(`unbalanced « » (${fo}/${fc})`)
  const po = (plain.match(/\(/g) ?? []).length
  const pc = (plain.match(/\)/g) ?? []).length
  if (po !== pc) f.push(`unbalanced ( ) (${po}/${pc})`)
  if (locale === 'fr') {
    if (/[^\u00a0\s][:;?!»]/.test(plain.replace(/https?:\/\/\S+/g, '').replace(/\d:\d/g, ''))) f.push('French: no space before : ; ? ! »')
    if (/ [:;?!»%]/.test(plain)) f.push('French: normal space (not NBSP) before : ; ? ! » %')
    if (/«[^\u00a0]/.test(plain)) f.push('French: no NBSP after «')
    if (/\d %/.test(plain) === false && /\d%/.test(plain)) f.push('French: % without NBSP')
    if (/[“”]/.test(plain) && !/«/.test(plain)) f.push('French: “ ” instead of « »')
  }
  if (locale === 'en' || locale === 'pt') {
    if (/[«»]/.test(plain)) f.push('« » in en/pt')
  }
  const wa = words(es)
  const wt = words(tr)
  if (wa >= 12) {
    const r = wt / wa
    if (r < 0.7 || r > 1.55) f.push(`length ratio ${r.toFixed(2)} (${wa}→${wt} words)`)
  }
  return f
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  const md: Record<string, string[]> = { en: [], pt: [], fr: [] }
  let totalIssues = 0
  let totalFlags = 0
  let n = 0
  for (const slug of slugs) {
    n++
    const { data: c } = await sb.from('content').select('id, slug').eq('slug', slug).single()
    if (!c) { console.log(`#${n} ${slug}: not found`); continue }
    const { data: rows } = await sb.from('content_translations').select('locale, title, excerpt, body, is_auto_translated, needs_review').eq('content_id', c.id)
    const es = rows?.find((r) => r.locale === 'es')
    if (!es || !Array.isArray(es.body)) { console.log(`#${n} ${slug}: no Spanish body`); continue }
    const esUnits = collectUnits(es.body as Block[])
    console.log(`\n#${n} ${slug}  (${esUnits.length} units)`)
    for (const loc of LOCALES) {
      const tr = rows?.find((r) => r.locale === loc)
      if (!tr) { console.log(`  ${loc}: NO ROW`); continue }
      if (!Array.isArray(tr.body)) { console.log(`  ${loc}: NO BODY`); continue }
      const issues: string[] = []
      if (tr.is_auto_translated) issues.push('row is marked as automatic')
      if (tr.needs_review) issues.push('row is marked needs_review')
      diffBlocks(es.body as Block[], tr.body as Block[], '', issues)
      const trUnits = collectUnits(tr.body as Block[])
      const flags: Flag[] = []
      if (trUnits.length !== esUnits.length) issues.push(`units ${esUnits.length} vs ${trUnits.length}`)
      else esUnits.forEach((u, i) => {
        if (u.path !== trUnits[i].path) issues.push(`unit ${i}: path ${u.path} ≠ ${trUnits[i].path}`)
        for (const msg of checkUnit(loc, u.markup, trUnits[i].markup)) flags.push({ unit: i, msg })
      })
      if (es.title && !tr.title) issues.push('no title')
      if (es.excerpt && !tr.excerpt) issues.push('Spanish has an excerpt, translation has none')
      if (!es.excerpt && tr.excerpt) issues.push(`translation has an excerpt the Spanish lacks: "${String(tr.excerpt).slice(0, 80)}"`)
      totalIssues += issues.length
      totalFlags += flags.length
      console.log(`  ${loc}: structure issues ${issues.length}, unit flags ${flags.length}`)
      issues.forEach((s) => console.log(`     ! ${s}`))
      flags.forEach((x) => console.log(`     · unit ${x.unit}: ${x.msg}`))
      // side by side for a human read
      const lines: string[] = [`\n## #${n} · ${slug}`, `TITLE ES: ${es.title}`, `TITLE ${loc.toUpperCase()}: ${tr.title}`]
      if (es.excerpt || tr.excerpt) lines.push(`EXCERPT ES: ${String(es.excerpt ?? '').replace(/\s+/g, ' ')}`, `EXCERPT ${loc.toUpperCase()}: ${String(tr.excerpt ?? '').replace(/\s+/g, ' ')}`)
      esUnits.forEach((u, i) => {
        const t = trUnits[i]
        const fl = flags.filter((x) => x.unit === i).map((x) => x.msg)
        lines.push('', `[${i}] (${u.block}${u.kind === 'caption' ? '/caption' : ''})${fl.length ? '  ⚠ ' + fl.join('; ') : ''}`, `ES: ${u.markup}`, `${loc.toUpperCase()}: ${t?.markup ?? '(missing)'}`)
      })
      md[loc].push(lines.join('\n'))
    }
  }
  for (const loc of LOCALES) writeFileSync(`${outDir}/side-by-side-${loc}.md`, md[loc].join('\n\n') + '\n')
  console.log(`\nTOTAL structure issues ${totalIssues}, unit flags ${totalFlags}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
