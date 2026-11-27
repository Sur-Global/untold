/**
 * Checks the hand-translation mark-up against every Spanish article body on the platform: each text unit must turn into
 * mark-up and back with exactly the same bold / italic / links / note markers. Lists the units that need the tag form
 * (<b>/<i>) and any unit that still cannot be read back. Read-only.
 *
 * Run: npx tsx --env-file=.env.local scripts/check-units-roundtrip.ts
 */
import { createClient } from '@supabase/supabase-js'
import { collectUnits, inlineShape, markupToInline } from './lib/translate-blocks'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const get = (o: any, path: string) => path.split('.').reduce((c, k) => (Array.isArray(c) ? c[Number(k)] : c[k]), o)

async function main() {
  const { data } = await sb.from('content_translations').select('body, content!inner(slug)').eq('locale', 'es')
  let units = 0, tags = 0, bad = 0, articles = 0
  for (const r of data ?? []) {
    if (!Array.isArray(r.body)) continue
    articles++
    let list
    try { list = collectUnits(r.body as any[]) } catch (e) { console.log(`✗ ${(r as any).content.slug}: ${(e as Error).message}`); bad++; continue }
    for (const u of list) {
      if (u.kind !== 'inline') continue
      units++
      if (/<\/?[bi]>/.test(u.markup)) { tags++; console.log(`tag form  ${(r as any).content.slug}  ${u.path}  ${u.markup.slice(0, 90)}`) }
      if (JSON.stringify(inlineShape(get(r.body, u.path))) !== JSON.stringify(inlineShape(markupToInline(u.markup)))) {
        bad++
        console.log(`✗ ${(r as any).content.slug}  ${u.path}  ${u.markup.slice(0, 90)}`)
      }
    }
  }
  console.log(`${articles} articles, ${units} units: ${tags} in tag form, ${bad} that cannot be read back`)
}
main()
