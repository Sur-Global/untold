/**
 * Imports Ghost posts that are missing from Supabase.
 * Run: npx tsx --env-file=.env.local scripts/import-missing-posts.ts
 */
import { createClient } from '@supabase/supabase-js'
import { JSDOM } from 'jsdom'

const GHOST_URL = 'https://untoldmag.ghost.io'
const GHOST_API_KEY = '2b1630029948b2da335b2b5c5e'
const SOURCE_LOCALE = 'es'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Ghost types ──────────────────────────────────────────────────────────────

interface GhostTag { id: string; name: string; slug: string }
interface GhostPost {
  id: string; slug: string; title: string; html: string | null
  feature_image: string | null; feature_image_alt: string | null; feature_image_caption: string | null
  custom_excerpt: string | null; excerpt: string | null
  reading_time: number; published_at: string; status: string; featured: boolean
  tags: GhostTag[]
}

// Ghost's feature_image_caption is a small HTML fragment (e.g. `<a href="URL">Label</a>`).
// Our image_credits column stores the `[label](url)` bracket syntax instead (see lib/photo-credit.ts),
// so convert any anchor tags and strip everything else down to plain text.
function ghostCaptionToBracketSyntax(html: string): string {
  const dom = new JSDOM(`<div id="root">${html}</div>`)
  const root = dom.window.document.getElementById('root')!
  for (const a of Array.from(root.querySelectorAll('a')) as any[]) {
    const href = a.getAttribute('href') ?? ''
    const label = a.textContent?.trim() ?? ''
    a.replaceWith(dom.window.document.createTextNode(label ? `[${label}](${href})` : ''))
  }
  return (root.textContent ?? '').trim()
}

// ── Ghost fetching ────────────────────────────────────────────────────────────

async function fetchAllGhostPosts(): Promise<GhostPost[]> {
  const all: GhostPost[] = []
  let page = 1
  while (true) {
    const url = `${GHOST_URL}/ghost/api/content/posts/?key=${GHOST_API_KEY}&include=tags&formats=html&limit=15&page=${page}&filter=status:published`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Ghost API ${res.status}: ${res.statusText}`)
    const data = await res.json() as any
    all.push(...data.posts)
    if (!data.meta.pagination.next) break
    page++
  }
  return all
}

// ── HTML → Tiptap conversion (copied from import-ghost.ts) ───────────────────

type TNode = Record<string, unknown>
function textNode(text: string, marks: TNode[] = []): TNode {
  return marks.length ? { type: 'text', text, marks } : { type: 'text', text }
}
function getInlines(el: Element): TNode[] {
  const nodes: TNode[] = []
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3) {
      const text = child.textContent ?? ''
      if (text) nodes.push(textNode(text))
    } else if (child.nodeType === 1) {
      const ce = child as Element
      const tag = ce.tagName.toLowerCase()
      if (tag === 'strong' || tag === 'b') {
        for (const n of getInlines(ce)) nodes.push(n.type === 'text' ? { ...n, marks: [...((n.marks as TNode[]) ?? []), { type: 'bold' }] } : n)
      } else if (tag === 'em' || tag === 'i') {
        for (const n of getInlines(ce)) nodes.push(n.type === 'text' ? { ...n, marks: [...((n.marks as TNode[]) ?? []), { type: 'italic' }] } : n)
      } else if (tag === 'code') {
        const t = ce.textContent ?? ''; if (t) nodes.push(textNode(t, [{ type: 'code' }]))
      } else if (tag === 'a') {
        const href = ce.getAttribute('href') ?? ''
        for (const n of getInlines(ce)) nodes.push(n.type === 'text' ? { ...n, marks: [...((n.marks as TNode[]) ?? []), { type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer' } }] } : n)
      } else if (tag === 'br') {
        nodes.push({ type: 'hardBreak' })
      } else {
        nodes.push(...getInlines(ce))
      }
    }
  }
  return nodes
}
async function listItems(listEl: Element): Promise<TNode[]> {
  const items: TNode[] = []
  for (const li of Array.from(listEl.querySelectorAll(':scope > li'))) {
    const inlines = getInlines(li)
    if (inlines.length) items.push({ type: 'listItem', content: [{ type: 'paragraph', content: inlines }] })
  }
  return items
}
async function convertNode(el: Node): Promise<TNode[]> {
  if (el.nodeType !== 1) return []
  const elem = el as Element
  const tag = elem.tagName?.toLowerCase()
  switch (tag) {
    case 'p': { const inlines = getInlines(elem); return inlines.length ? [{ type: 'paragraph', content: inlines }] : [] }
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
      const inlines = getInlines(elem); return inlines.length ? [{ type: 'heading', attrs: { level: parseInt(tag[1]) }, content: inlines }] : []
    }
    case 'blockquote': { const inner: TNode[] = []; for (const c of Array.from(elem.childNodes)) inner.push(...await convertNode(c)); return inner.length ? [{ type: 'blockquote', content: inner }] : [] }
    case 'ul': { const items = await listItems(elem); return items.length ? [{ type: 'bulletList', content: items }] : [] }
    case 'ol': { const items = await listItems(elem); return items.length ? [{ type: 'orderedList', content: items }] : [] }
    case 'hr': return [{ type: 'horizontalRule' }]
    case 'pre': { const code = elem.querySelector('code'); const text = (code ?? elem).textContent ?? ''; return text.trim() ? [{ type: 'codeBlock', attrs: {}, content: [{ type: 'text', text }] }] : [] }
    case 'img': { const src = elem.getAttribute('src'); if (!src) return []; const alt = elem.getAttribute('alt') ?? ''; return [{ type: 'image', attrs: { src, alt, title: alt || null } }] }
    case 'figure': {
      const cls = elem.className ?? ''
      if (cls.includes('kg-image-card')) {
        const img = elem.querySelector('img'); if (!img) return []
        const src = img.getAttribute('src'); if (!src) return []
        const alt = img.getAttribute('alt') ?? elem.querySelector('figcaption')?.textContent ?? ''
        return [{ type: 'image', attrs: { src, alt, title: alt || null } }]
      }
      if (cls.includes('kg-embed-card')) return []
      const inner: TNode[] = []; for (const c of Array.from(elem.childNodes)) inner.push(...await convertNode(c)); return inner
    }
    case 'div': {
      const cls = elem.className ?? ''
      if (cls.includes('kg-gallery-card')) {
        const nodes: TNode[] = []
        for (const img of Array.from(elem.querySelectorAll('img'))) {
          const src = img.getAttribute('src'); if (src) nodes.push({ type: 'image', attrs: { src, alt: img.getAttribute('alt') ?? '', title: null } })
        }
        return nodes
      }
      if (cls.includes('kg-card')) return []
      const inner: TNode[] = []; for (const c of Array.from(elem.childNodes)) inner.push(...await convertNode(c)); return inner
    }
    default: {
      if (['section', 'article', 'aside', 'header', 'footer', 'main'].includes(tag)) {
        const inner: TNode[] = []; for (const c of Array.from(elem.childNodes)) inner.push(...await convertNode(c)); return inner
      }
      return []
    }
  }
}
async function htmlToTiptap(html: string): Promise<TNode> {
  const dom = new JSDOM(`<div id="root">${html}</div>`)
  const root = dom.window.document.getElementById('root')!
  const content: TNode[] = []
  for (const child of Array.from(root.childNodes)) content.push(...await convertNode(child as Element))
  if (content.length === 0) content.push({ type: 'paragraph', content: [] })
  return { type: 'doc', content }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Get existing slugs from DB
  const { data: existing } = await (sb as any).from('content').select('slug')
  const existingSlugs = new Set((existing ?? []).map((r: any) => r.slug))
  console.log(`Existing DB slugs: ${existingSlugs.size}`)

  // Fetch all Ghost posts
  const posts = await fetchAllGhostPosts()
  console.log(`Ghost posts: ${posts.length}`)

  // Find missing
  const missing = posts.filter(p => !existingSlugs.has(p.slug))
  console.log(`\nMissing posts: ${missing.length}`)
  if (missing.length === 0) { console.log('Nothing to import.'); return }
  for (const p of missing) console.log(`  - ${p.slug}`)

  // Resolve admin profile (info@surglobal.io)
  const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const adminUser = users.find(u => u.email === 'info@surglobal.io')
  if (!adminUser) { console.error('Admin user info@surglobal.io not found'); return }
  const adminId = adminUser.id

  // Upsert tags for missing posts
  const tagMap = new Map<string, { slug: string; names: Record<string, string> }>()
  for (const post of missing) {
    for (const t of post.tags ?? []) {
      if (!t.slug.startsWith('#')) tagMap.set(t.slug, { slug: t.slug, names: { [SOURCE_LOCALE]: t.name } })
    }
  }
  const tagRows = Array.from(tagMap.values())
  const { data: upsertedTags } = await (sb as any).from('tags').upsert(tagRows, { onConflict: 'slug' }).select('id, slug')
  const tagIdMap: Record<string, string> = {}
  for (const t of upsertedTags ?? []) tagIdMap[t.slug] = t.id
  console.log(`\nUpserted ${tagRows.length} tags`)

  // Import missing posts
  console.log('\nImporting:')
  for (const post of missing) {
    process.stdout.write(`  "${post.title}" (${post.slug})… `)

    const body: TNode = post.html ? await htmlToTiptap(post.html) : { type: 'doc', content: [{ type: 'paragraph', content: [] }] }

    const { data: content, error: contentErr } = await (sb as any)
      .from('content')
      .upsert({
        author_id: adminId, type: 'article', slug: post.slug,
        source_locale: SOURCE_LOCALE, status: 'published',
        is_featured: post.featured ?? false, cover_image_url: post.feature_image ?? null,
        image_credits: post.feature_image_caption
          ? ghostCaptionToBracketSyntax(post.feature_image_caption)
          : (post.feature_image_alt || null),
        read_time_minutes: post.reading_time || null, published_at: post.published_at,
      }, { onConflict: 'slug' })
      .select('id').single()

    if (contentErr) { console.log(`✗ ${contentErr.message}`); continue }

    const excerpt = post.custom_excerpt || post.excerpt?.slice(0, 400) || null
    await (sb as any).from('content_translations').upsert({
      content_id: content.id, locale: SOURCE_LOCALE, title: post.title, excerpt, body,
    }, { onConflict: 'content_id,locale' })

    const postTagRows = (post.tags ?? [])
      .filter(t => !t.slug.startsWith('#') && tagIdMap[t.slug])
      .map(t => ({ content_id: content.id, tag_id: tagIdMap[t.slug] }))
    if (postTagRows.length) {
      await (sb as any).from('content_tags').upsert(postTagRows, { onConflict: 'content_id,tag_id' })
    }

    console.log(`✓  (${postTagRows.length} tags)`)
  }
  console.log('\nDone.')
}

main().catch(console.error)
