/**
 * Every step of a hand-translation batch in one command, so the whole job runs under one permission rule.
 * Works on Elsie's numbered review list (docs/articulos-ghost-vs-nueva.md) and a work folder per article.
 *
 *   npx tsx --env-file=.env.local scripts/translation-batch.ts export <n> [<n> …]   export articles by list number
 *   npx tsx --env-file=.env.local scripts/translation-batch.ts check <n> [<n> …]    style checks + dry-run save check
 *   npx tsx --env-file=.env.local scripts/translation-batch.ts save <n> [<n> …]     back up the current rows, then save
 *   npx tsx --env-file=.env.local scripts/translation-batch.ts live <n> [<n> …]     wait (≤ 10 min) until the site shows the new titles
 *
 * Add --work <dir> to any step to choose the work folder (default $TRANSLATION_WORK or .claude/translation-work).
 * Work folders: <WORK>/<slug>/. export writes es.json, en/pt/fr.json,
 * es.units.json there (same files as dump-article-units.ts); the translators write out-en/pt/fr.json there.
 * Backups before saving: .claude/backups/translations-<date>/<slug>/.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const argv = process.argv.slice(2)
const wi = argv.indexOf('--work')
// the work folder: --work <dir> (use the session's scratchpad, where the translators can write without approval)
const WORK = wi >= 0 ? argv.splice(wi, 2)[1] : process.env.TRANSLATION_WORK || '.claude/translation-work'
const [cmd, ...nums] = argv
const SITE = 'https://www.untold.ink'

const list = readFileSync('docs/articulos-ghost-vs-nueva.md', 'utf8').split('\n').flatMap((l) => {
  const n = l.match(/^\|\s*(\d+)\s*\|/)?.[1]
  const slug = l.match(/\/articles\/([^)\s]+)\)/)?.[1]
  return n && slug ? [{ n: Number(n), slug }] : []
})
const slugOf = (n: string) => {
  const r = list.find((x) => x.n === Number(n))
  if (!r) throw new Error(`#${n} is not in docs/articulos-ghost-vs-nueva.md`)
  return r.slug
}
const dir = (slug: string) => `${WORK}/${slug}`
const tsx = (script: string, args: string[]) =>
  execFileSync('npx', ['tsx', '--env-file=.env.local', script, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const contentId = (slug: string) => JSON.parse(readFileSync(`${dir(slug)}/es.json`, 'utf8')).content_id as string

/** House-style checks the save script does not do (French spacing, apostrophes, series name, suspicious lengths). */
function styleIssues(slug: string): string[] {
  const es: { markup: string }[] = JSON.parse(readFileSync(`${dir(slug)}/es.units.json`, 'utf8'))
  const issues: string[] = []
  for (const l of ['en', 'pt', 'fr']) {
    const f = `${dir(slug)}/out-${l}.json`
    if (!existsSync(f)) { issues.push(`${l}: out-${l}.json missing`); continue }
    const o = JSON.parse(readFileSync(f, 'utf8'))
    o.units.forEach((t: string, i: number) => {
      const s = es[i]?.markup ?? ''
      if (s.length > 40 && !(t.length / s.length > 0.6 && t.length / s.length < 1.7)) issues.push(`${l} unit ${i}: length ratio ${(t.length / s.length).toFixed(2)} (check nothing is missing or added)`)
      const c = t.replace(/\]\([^)]*\)|https?:\/\/\S+/g, '')
      if (l === 'fr' && /( [;:?!»]|« )/.test(c)) issues.push(`fr unit ${i}: ordinary space where French needs a no-break space`)
      if (l === 'fr' && /[^ \s][;?!](\s|$)/.test(c)) issues.push(`fr unit ${i}: no space before ; ? !`)
      if ((l === 'en' || l === 'fr') && c.includes("'")) issues.push(`${l} unit ${i}: straight apostrophe '`)
      if (/Maps of|déviation|détournement|Mapas d/.test(t)) issues.push(`${l} unit ${i}: wrong name for Cartografías del Desvío`)
    })
    console.log(`  ${l}: “${o.title}”`)
  }
  return issues
}

async function titleOnSite(slug: string, locale: string): Promise<string> {
  const res = await fetch(`${SITE}${locale === 'en' ? '' : '/' + locale}/articles/${slug}`)
  const h1 = (await res.text()).match(/<h1[^>]*>([^<]*)/)?.[1] ?? ''
  return h1.replace(/&#x27;/g, '’').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
}

async function main() {
  if (!cmd || !nums.length) throw new Error('usage: translation-batch.ts export|check|save|live <list number> […]')
  for (const n of nums) {
    const slug = slugOf(n)
    console.log(`\n#${n} ${slug}`)
    if (cmd === 'export') {
      mkdirSync(dir(slug), { recursive: true })
      const out = tsx('scripts/dump-article-units.ts', [slug, dir(slug), '--quiet'])
      const head = out.split('\n')[0]
      const es = JSON.parse(readFileSync(`${dir(slug)}/es.json`, 'utf8'))
      const units: { markup: string }[] = JSON.parse(readFileSync(`${dir(slug)}/es.units.json`, 'utf8'))
      const words = units.reduce((a, u) => a + (u.markup.match(/[\p{L}\p{N}]+/gu)?.length ?? 0), 0)
      console.log(`  ${head}\n  folder: ${dir(slug)}\n  ${units.length} units, ~${words} words — “${es.title}”`)
      console.log(`  excerpt: ${JSON.stringify((es.excerpt ?? '').slice(0, 160))}\n  summary: ${JSON.stringify((es.featured_summary ?? '').slice(0, 160))}`)
      for (const l of ['en', 'pt', 'fr']) {
        const f = `${dir(slug)}/${l}.json`
        if (!existsSync(f)) { console.log(`  ${l}: no row`); continue }
        const r = JSON.parse(readFileSync(f, 'utf8'))
        console.log(`  ${l}: ${!r.body ? 'title only' : r.is_auto_translated ? 'DeepL' : 'hand'} — “${r.title}”`)
      }
      const tags = units.flatMap((u, i) => (/<\/?[bi]>/.test(u.markup) ? [i] : []))
      if (tags.length) console.log(`  units in tag form (<b>/<i>): ${tags.join(', ')}`)
    } else if (cmd === 'check' || cmd === 'save') {
      const issues = styleIssues(slug)
      issues.forEach((i) => console.log(`  ! ${i}`))
      const id = contentId(slug)
      if (cmd === 'check') {
        console.log(tsx('scripts/save-hand-translations-article.ts', [id, dir(slug), '--dry']).trim().replace(/^/gm, '  '))
      } else {
        const b = `.claude/backups/translations-${new Date().toISOString().slice(0, 10)}/${slug}`
        mkdirSync(b, { recursive: true })
        for (const f of ['es', 'en', 'pt', 'fr']) if (existsSync(`${dir(slug)}/${f}.json`)) copyFileSync(`${dir(slug)}/${f}.json`, `${b}/${f}.json`)
        console.log(`  backup: ${b}`)
        console.log(tsx('scripts/save-hand-translations-article.ts', [id, dir(slug)]).trim().replace(/^/gm, '  '))
      }
    } else if (cmd === 'live') {
      const want = Object.fromEntries(['en', 'pt', 'fr'].map((l) => [l, JSON.parse(readFileSync(`${dir(slug)}/out-${l}.json`, 'utf8')).title as string]))
      const start = Date.now()
      for (;;) {
        const got = Object.fromEntries(await Promise.all(['en', 'pt', 'fr'].map(async (l) => [l, await titleOnSite(slug, l)])))
        const ok = ['en', 'pt', 'fr'].filter((l) => got[l].trim() === want[l].trim())
        if (ok.length === 3) { ['en', 'pt', 'fr'].forEach((l) => console.log(`  ${l}: ${got[l]}`)); console.log('  ✓ live in all three'); break }
        if (Date.now() - start > 10 * 60_000) { console.log(`  ✗ after 10 min, not yet live: ${['en', 'pt', 'fr'].filter((l) => !ok.includes(l)).join(', ')}`); break }
        await new Promise((r) => setTimeout(r, 20_000))
      }
    } else throw new Error(`unknown step "${cmd}"`)
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? (e as any).stderr || e.message : e)
  process.exit(1)
})
