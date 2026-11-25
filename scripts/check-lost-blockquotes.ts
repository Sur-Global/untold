/**
 * Compares each old Ghost post (backup .claude/backups/ghost-export-2026-11-02/ghost-posts-64.json) with the Spanish
 * body on the platform: how many block quotes Ghost had, and how many of their texts are missing from the platform.
 * The Ghost import dropped <blockquote> elements, so quoted passages disappeared from some articles. Read-only.
 *
 * Run: npx tsx --env-file=.env.local scripts/check-lost-blockquotes.ts
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const raw = JSON.parse(readFileSync('.claude/backups/ghost-export-2026-11-02/ghost-posts-64.json', 'utf8'))
const posts: any[] = Array.isArray(raw) ? raw : raw.posts
const decode = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const norm = (s: string) => s.normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase()
const list = readFileSync('docs/articulos-ghost-vs-nueva.md', 'utf8')

async function main() {
  for (const p of posts) {
    const quotes = [...(p.html ?? '').matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g)].map((m) => decode(m[1]).trim()).filter(Boolean)
    if (!quotes.length) continue
    const { data: c } = await sb.from('content').select('id, content_translations(locale, body)').eq('slug', p.slug).maybeSingle()
    const es = (c as any)?.content_translations?.find((t: any) => t.locale === 'es')
    const body = norm(JSON.stringify(es?.body ?? '').replace(/\\"/g, '"'))
    const lost = quotes.filter((q) => !body.includes(norm(q).slice(0, 60)))
    const n = list.match(new RegExp(`^\\|\\s*(\\d+)\\s*\\|[^\\n]*/articles/${p.slug}\\)`, 'm'))?.[1] ?? '?'
    if (lost.length) console.log(`#${n}\t${p.slug}\t${lost.length} of ${quotes.length} quotes missing\t“${lost[0].slice(0, 70)}…”`)
  }
}
main()
