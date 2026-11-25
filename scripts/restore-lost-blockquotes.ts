/**
 * Puts back the block quotes that the Ghost import dropped (see scripts/check-lost-blockquotes.ts).
 *
 * For each quote in the old Ghost post (backup .claude/backups/ghost-export-2026-11-02/ghost-posts-64.json), it finds the
 * block on the platform that Ghost had right before the quote (matched by its last words) and, if the quote is not already
 * there, inserts a "quote" block after it in the Spanish body. Italics, bold and links inside the quote are kept.
 * Hand-written translations (en/pt/fr rows with is_auto_translated = false and a body) get the same block, with the same
 * id, at the same place — with the translated text given in a JSON file; a hand translation without a translated quote is
 * left alone and reported. DeepL rows and title-only rows are not touched (they get translated later).
 * Before writing, every body it changes is saved to .claude/backups/blockquotes-<date>/<slug>.json.
 *
 * Run: npx tsx --env-file=.env.local scripts/restore-lost-blockquotes.ts <slug> [--translations file.json] [--dry]
 *   file.json: { "en": ["quote 1", ...], "pt": [...], "fr": [...] } — one entry per restored quote, in order; mark-up as in
 *   scripts/lib/translate-blocks.ts (**bold**, *italic*, [label](url)).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { markupToInline } from './lib/translate-blocks'

const [slug] = process.argv.slice(2)
const dry = process.argv.includes('--dry')
const trFile = process.argv.includes('--translations') ? process.argv[process.argv.indexOf('--translations') + 1] : null
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const entities = (s: string) =>
  s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const norm = (s: string) => s.normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase()
const textOf = (items: any[] | undefined): string => (items ?? []).map((i) => (i.type === 'link' ? textOf(i.content) : i.text ?? '')).join('')

/** Ghost quote HTML → BlockNote inline content (text with bold/italic, links). */
function htmlToInline(html: string): any[] {
  const out: any[] = []
  const styles = { bold: 0, italic: 0 }
  let link: { href: string; content: any[] } | null = null
  for (const part of html.replace(/<br\s*\/?>/g, '\n').split(/(<[^>]+>)/)) {
    if (!part) continue
    const tag = part.match(/^<(\/?)(\w+)([^>]*)>$/)
    if (tag) {
      const [, close, name, attrs] = tag
      const d = close ? -1 : 1
      if (name === 'strong' || name === 'b') styles.bold += d
      else if (name === 'em' || name === 'i') styles.italic += d
      else if (name === 'a' && !close) link = { href: entities(attrs.match(/href="([^"]*)"/)?.[1] ?? ''), content: [] }
      else if (name === 'a' && close && link) { out.push({ type: 'link', href: link.href, content: link.content }); link = null }
      continue
    }
    const run = { type: 'text', text: entities(part), styles: { ...(styles.bold ? { bold: true } : {}), ...(styles.italic ? { italic: true } : {}) } }
    ;(link ? link.content : out).push(run)
  }
  // trim the outer whitespace
  const first = out[0], last = out[out.length - 1]
  if (first?.type === 'text') first.text = first.text.replace(/^\s+/, '')
  if (last?.type === 'text') last.text = last.text.replace(/\s+$/, '')
  return out.filter((r) => r.type !== 'text' || r.text)
}

const quoteBlock = (id: string, content: any[]) => ({ id, type: 'quote', props: { textColor: 'default', backgroundColor: 'default' }, content, children: [] })

async function main() {
  if (!slug) throw new Error('usage: restore-lost-blockquotes.ts <slug> [--translations file.json] [--dry]')
  const raw = JSON.parse(readFileSync('.claude/backups/ghost-export-2026-11-02/ghost-posts-64.json', 'utf8'))
  const post = (Array.isArray(raw) ? raw : raw.posts).find((p: any) => p.slug === slug)
  if (!post) throw new Error('not in the Ghost backup')
  const { data: c } = await sb.from('content').select('id, content_translations(id, locale, body, is_auto_translated)').eq('slug', slug).single()
  const rows = (c as any).content_translations as any[]
  const es = rows.find((r) => r.locale === 'es')
  if (!Array.isArray(es?.body)) throw new Error('Spanish body is not in block format')
  const translations: Record<string, string[]> = trFile ? JSON.parse(readFileSync(trFile, 'utf8')) : {}

  // the quotes and the text of the element right before each one in Ghost
  const html: string = post.html
  const found: { anchor: string; inline: any[] }[] = []
  for (const m of html.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g)) {
    const before = html.slice(0, m.index)
    const prev = [...before.matchAll(/<(p|h[1-6])[^>]*>([\s\S]*?)<\/\1>/g)].pop()
    const inner = m[1].replace(/^\s*<p[^>]*>|<\/p>\s*$/g, '').replace(/<\/p>\s*<p[^>]*>/g, '<br>')
    found.push({ anchor: norm(entities((prev?.[2] ?? '').replace(/<[^>]+>/g, ' '))).slice(-60), inline: htmlToInline(inner) })
  }

  const body: any[] = structuredClone(es.body)
  const inserted: { afterId: string; id: string }[] = []
  for (const q of found) {
    const qText = norm(textOf(q.inline))
    const at = body.findIndex((b) => norm(textOf(b.content)).endsWith(q.anchor))
    if (at < 0) { console.log(`✗ place not found for “${textOf(q.inline).slice(0, 60)}…” (anchor “…${q.anchor.slice(-40)}”)`); continue }
    const next = body[at + 1]
    if (next && norm(textOf(next.content)).startsWith(qText.slice(0, 40))) { console.log(`= already there: “${textOf(q.inline).slice(0, 60)}…”`); continue }
    const id = randomUUID()
    body.splice(at + 1, 0, quoteBlock(id, q.inline))
    inserted.push({ afterId: body[at].id, id })
    console.log(`+ after “…${textOf(body[at].content).slice(-50)}”\n    “${textOf(q.inline).slice(0, 110)}…”`)
  }
  if (!inserted.length) return console.log('nothing to restore')

  const updates: { row: any; body: any[] }[] = [{ row: es, body }]
  for (const r of rows) {
    if (r.locale === 'es' || r.is_auto_translated || !Array.isArray(r.body)) continue
    const tr = translations[r.locale]
    if (!tr || tr.length !== inserted.length) { console.log(`! ${r.locale}: hand translation NOT updated (give ${inserted.length} translated quote(s) in --translations)`); continue }
    const tb: any[] = structuredClone(r.body)
    inserted.forEach((ins, i) => {
      const at = tb.findIndex((b) => b.id === ins.afterId)
      if (at < 0) throw new Error(`${r.locale}: block ${ins.afterId} not found in the translation`)
      tb.splice(at + 1, 0, quoteBlock(ins.id, markupToInline(tr[i])))
    })
    updates.push({ row: r, body: tb })
    console.log(`  ${r.locale}: ${inserted.length} translated quote(s) added`)
  }
  if (dry) return console.log('(dry run: nothing saved)')

  const dir = `.claude/backups/blockquotes-${new Date().toISOString().slice(0, 10)}`
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/${slug}.json`, JSON.stringify(rows.filter((r) => updates.some((u) => u.row.id === r.id)), null, 1))
  for (const u of updates) {
    const { error } = await sb.from('content_translations').update({ body: u.body }).eq('id', u.row.id)
    if (error) throw new Error(`${u.row.locale}: ${error.message}`)
    console.log(`✓ saved ${u.row.locale}`)
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
