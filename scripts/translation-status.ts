/**
 * State of the translations of the articles in docs/articulos-ghost-vs-nueva.md (Elsie's numbered review list), in order.
 * For each language: hand = written by hand, DeepL = machine translation, stub = title only (readers see the original), — = no row.
 * Read-only.
 *
 * Run: npx tsx --env-file=.env.local scripts/translation-status.ts [--todo]   (--todo: only articles with something not hand-translated)
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const todo = process.argv.includes('--todo')

const rows = readFileSync('docs/articulos-ghost-vs-nueva.md', 'utf8').split('\n').flatMap((l) => {
  const m = l.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|/)
  const slug = l.match(/\/articles\/([^)\s]+)\)/)?.[1]
  return m && slug ? [{ n: Number(m[1]), title: m[2], slug }] : []
})

const words = (b: unknown) =>
  JSON.stringify(b ?? '')
    .replace(/"(id|type|props|styles|textColor|backgroundColor|textAlignment|level|href|url)"\s*:\s*"[^"]*"/g, ' ')
    .replace(/[{}\[\]",:]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length

async function main() {
  for (const r of rows) {
    const { data: c } = await sb.from('content').select('id, content_translations(locale, body, is_auto_translated)').eq('slug', r.slug).maybeSingle()
    if (!c) { console.log(`${r.n}\t${r.title}\tNOT FOUND (${r.slug})`); continue }
    const tr = (c as any).content_translations as { locale: string; body: unknown; is_auto_translated: boolean }[]
    const es = tr.find((t) => t.locale === 'es')
    const state = ['en', 'pt', 'fr'].map((l) => {
      const t = tr.find((x) => x.locale === l)
      return `${l}:${!t ? '—' : !t.body ? 'stub' : t.is_auto_translated ? 'DeepL' : 'hand'}`
    })
    if (todo && state.every((s) => s.endsWith('hand'))) continue
    const legacy = es?.body && !Array.isArray(es.body) ? '  LEGACY FORMAT' : ''
    console.log(`${r.n}\t${r.title.slice(0, 48).padEnd(48)}\t${state.join(' ')}\t~${words(es?.body)} words${legacy}`)
  }
}
main()
