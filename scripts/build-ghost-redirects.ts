/**
 * Builds lib/ghost-redirects.json: what the old Ghost site (untold.ink) answered at, and where each address lives on this platform.
 *
 *   posts          every published post → /es/articles/<same slug> (all of them were written in Spanish)
 *   tags           old tag slugs whose new slug is different → the new slug (the others keep the same address)
 *   tagsUnchanged  old tag slugs that exist unchanged here
 *   pages          old pages that exist at the same address here
 *
 * Every post, tag and page is checked against the database first; the script stops if one does not exist (or is not public).
 * The Ghost Content API key is public by design but is not kept in the code: pass it as GHOST_CONTENT_KEY.
 *
 * Run: GHOST_CONTENT_KEY=… npx tsx --env-file=.env.local scripts/build-ghost-redirects.ts
 */
import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const GHOST = 'https://untoldmag.ghost.io/ghost/api/content'
const KEY = process.env.GHOST_CONTENT_KEY
// Old tag slug → the slug it has on this platform (the old ones had typos or were English)
const RENAMED_TAGS: Record<string, string> = {
  ai: 'inteligencia-artificial',
  aicapitalism: 'inteligencia-artificial',
  'behaviorual-design': 'diseno-conductual',
  futures: 'futuros',
  research: 'investigacion',
  resistecia: 'resistencia',
  tech: 'tecnologia',
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

async function ghost(kind: 'posts' | 'pages' | 'tags'): Promise<string[]> {
  const res = await fetch(`${GHOST}/${kind}/?key=${KEY}&limit=all&fields=slug`)
  if (!res.ok) throw new Error(`Ghost ${kind}: ${res.status}`)
  return ((await res.json())[kind] as { slug: string }[]).map((x) => x.slug).sort()
}

async function main() {
  if (!KEY) throw new Error('Set GHOST_CONTENT_KEY')
  const [posts, pages, tags] = await Promise.all([ghost('posts'), ghost('pages'), ghost('tags')])

  const { data: content } = await sb.from('content').select('slug, type, status, source_locale').in('slug', posts)
  for (const slug of posts) {
    const c = content?.find((x) => x.slug === slug)
    if (!c) throw new Error(`post "${slug}" does not exist on the platform`)
    if (c.status !== 'published' || c.type !== 'article') throw new Error(`post "${slug}" is not a published article`)
    if (c.source_locale !== 'es') throw new Error(`post "${slug}" was not written in Spanish (${c.source_locale}): choose its language by hand`)
  }

  const { data: tagRows } = await sb.from('tags').select('slug')
  const ours = new Set((tagRows ?? []).map((t) => t.slug))
  const tagsUnchanged = tags.filter((t) => ours.has(t))
  const missing = tags.filter((t) => !ours.has(t) && !(t in RENAMED_TAGS))
  if (missing.length) throw new Error(`old tags with no new address: ${missing.join(', ')}`)
  for (const [from, to] of Object.entries(RENAMED_TAGS)) if (!ours.has(to)) throw new Error(`tag "${from}" points to "${to}", which does not exist`)

  const { data: staticPages } = await sb.from('static_pages').select('slug, status').in('slug', pages)
  for (const p of pages) if (staticPages?.find((x) => x.slug === p)?.status !== 'published') throw new Error(`page "${p}" is not published here`)

  const out = {
    generated: `Ghost Content API, ${new Date().toISOString().slice(0, 10)}`,
    posts,
    tags: Object.fromEntries(Object.entries(RENAMED_TAGS).filter(([from]) => tags.includes(from))),
    tagsUnchanged,
    pages,
  }
  writeFileSync('lib/ghost-redirects.json', JSON.stringify(out, null, 2) + '\n')
  console.log(`✓ ${posts.length} posts, ${Object.keys(out.tags).length} renamed tags, ${tagsUnchanged.length} unchanged tags, ${pages.length} page(s) → lib/ghost-redirects.json`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
