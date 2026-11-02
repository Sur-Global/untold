/**
 * Reads one article (by slug or id) for hand translation: writes every language row to <folder>/<locale>.json and the Spanish text
 * units to <folder>/es.units.json, and prints the Spanish text unit by unit together with the state of the other languages.
 * Read-only.
 *
 * Run: npx tsx --env-file=.env.local scripts/dump-article-units.ts <slug or id> <folder> [--quiet]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { collectUnits } from './lib/translate-blocks'

const [key, dir] = process.argv.slice(2)
const quiet = process.argv.includes('--quiet')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  if (!key || !dir) throw new Error('usage: dump-article-units.ts <slug or id> <folder> [--quiet]')
  mkdirSync(dir, { recursive: true })
  const isId = /^[0-9a-f-]{36}$/i.test(key)
  const { data: c } = await sb.from('content').select('id, slug, updated_at, source_locale').eq(isId ? 'id' : 'slug', key).single()
  if (!c) throw new Error('article not found')
  console.log(`content ${c.id}  ${c.slug}  updated_at ${c.updated_at}`)
  const { data: tr } = await sb.from('content_translations').select('*').eq('content_id', c.id)
  let es: any = null
  for (const t of tr ?? []) {
    writeFileSync(`${dir}/${t.locale}.json`, JSON.stringify(t, null, 1))
    const b: any = t.body
    const units = Array.isArray(b) ? collectUnits(b) : null
    if (t.locale === 'es') { es = t; writeFileSync(`${dir}/es.units.json`, JSON.stringify(units, null, 1)) }
    const words = units ? units.reduce((n, u) => n + u.markup.split(/\s+/).length, 0) : 0
    console.log(t.locale.padEnd(3), t.is_auto_translated ? 'auto ' : 'human', '|', units ? `${b.length} blocks, ${units.length} units, ~${words} words` : b === null ? 'no body' : 'legacy body', '| title:', t.title, '| excerpt:', (t.excerpt ?? '').slice(0, 60))
  }
  if (!es || quiet) return
  console.log('\n' + es.body.map((b: any, i: number) => `${i}:${b.type}`).join(' ') + '\n')
  collectUnits(es.body).forEach((u, i) => console.log(`[${i}] (${u.block}${u.kind === 'caption' ? '/caption' : ''}) ${u.markup}\n`))
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
