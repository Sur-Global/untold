/**
 * Import all published Ghost posts into Supabase.
 *
 * Before running:
 *   1. Set ADMIN_PROFILE_EMAIL below to the email of the admin account
 *      that imported articles should be attributed to.
 *   2. Run: npx tsx --env-file=.env.local scripts/import-ghost.ts
 */
import { createClient } from '@supabase/supabase-js'
import { JSDOM } from 'jsdom'

// ─── Config ──────────────────────────────────────────────────────────────────

const GHOST_URL = 'https://untoldmag.ghost.io'
const GHOST_API_KEY = '2b1630029948b2da335b2b5c5e'
const ADMIN_PROFILE_EMAIL = 'info@surglobal.io'
const STORAGE_BUCKET = 'media'
const SOURCE_LOCALE = 'es'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── Ghost API types ──────────────────────────────────────────────────────────

interface GhostTag {
  id: string
  name: string
  slug: string
}

interface GhostPost {
  id: string
  slug: string
  title: string
  html: string | null
  feature_image: string | null
  feature_image_alt: string | null
  feature_image_caption: string | null
  custom_excerpt: string | null
  excerpt: string | null
  reading_time: number
  published_at: string
  status: string
  featured: boolean
  tags: GhostTag[]
}

interface GhostApiResponse {
  posts: GhostPost[]
  meta: {
    pagination: {
      page: number
      limit: number
      pages: number
      total: number
      next: number | null
    }
  }
}

// ─── Ghost fetching ───────────────────────────────────────────────────────────

async function fetchAllGhostPosts(): Promise<GhostPost[]> {
  const all: GhostPost[] = []
  let page = 1

  while (true) {
    const url =
      `${GHOST_URL}/ghost/api/content/posts/` +
      `?key=${GHOST_API_KEY}&include=tags&formats=html` +
      `&limit=15&page=${page}&filter=status:published`
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) throw new Error(`Ghost API ${res.status}: ${res.statusText}`)
    const data = (await res.json()) as GhostApiResponse
    all.push(...data.posts)
    if (!data.meta.pagination.next) break
    page++
  }

  return all
}

// ─── Image upload ─────────────────────────────────────────────────────────────

// Images are kept at their original Ghost CDN URLs.
// To migrate them to Supabase Storage later, re-enable the upload logic below.
async function uploadImage(url: string, _prefix: string): Promise<string> {
  return url
}

// ─── HTML → Tiptap JSON ───────────────────────────────────────────────────────

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
        for (const n of getInlines(ce)) {
          if (n.type === 'text') nodes.push({ ...n, marks: [...((n.marks as TNode[]) ?? []), { type: 'bold' }] })
          else nodes.push(n)
        }
      } else if (tag === 'em' || tag === 'i') {
        for (const n of getInlines(ce)) {
          if (n.type === 'text') nodes.push({ ...n, marks: [...((n.marks as TNode[]) ?? []), { type: 'italic' }] })
          else nodes.push(n)
        }
      } else if (tag === 'code') {
        const t = ce.textContent ?? ''
        if (t) nodes.push(textNode(t, [{ type: 'code' }]))
      } else if (tag === 'a') {
        const href = ce.getAttribute('href') ?? ''
        for (const n of getInlines(ce)) {
          if (n.type === 'text')
            nodes.push({ ...n, marks: [...((n.marks as TNode[]) ?? []), { type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer' } }] })
          else nodes.push(n)
        }
      } else if (tag === 'br') {
        nodes.push({ type: 'hardBreak' })
      } else if (tag === 'span') {
        nodes.push(...getInlines(ce))
      } else {
        nodes.push(...getInlines(ce))
      }
    }
  }
  return nodes
}

async function convertNode(el: Node): Promise<TNode[]> {
  if (el.nodeType !== 1) return []
  const elem = el as Element
  const tag = elem.tagName?.toLowerCase()

  switch (tag) {
    case 'p': {
      const inlines = getInlines(elem)
      // Skip empty paragraphs Ghost sometimes produces
      const hasText = inlines.some(n => n.type === 'text' && String(n.text).trim())
      if (!hasText && inlines.length === 0) return []
      return [{ type: 'paragraph', content: inlines }]
    }

    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
      const inlines = getInlines(elem)
      if (inlines.length === 0) return []
      return [{ type: 'heading', attrs: { level: parseInt(tag[1]) }, content: inlines }]
    }

    case 'blockquote': {
      const inner: TNode[] = []
      for (const c of Array.from(elem.childNodes)) inner.push(...await convertNode(c))
      if (inner.length === 0) {
        const inlines = getInlines(elem)
        if (!inlines.length) return []
        inner.push({ type: 'paragraph', content: inlines })
      }
      return [{ type: 'blockquote', content: inner }]
    }

    case 'ul': {
      const items = await listItems(elem)
      return items.length ? [{ type: 'bulletList', content: items }] : []
    }

    case 'ol': {
      const items = await listItems(elem)
      return items.length ? [{ type: 'orderedList', content: items }] : []
    }

    case 'hr':
      return [{ type: 'horizontalRule' }]

    case 'pre': {
      const code = elem.querySelector('code')
      const text = (code ?? elem).textContent ?? ''
      return text.trim() ? [{ type: 'codeBlock', attrs: {}, content: [{ type: 'text', text }] }] : []
    }

    case 'img': {
      const src = elem.getAttribute('src')
      if (!src) return []
      const uploaded = await uploadImage(src, 'inline')
      const alt = elem.getAttribute('alt') ?? ''
      return [{ type: 'image', attrs: { src: uploaded, alt, title: alt || null } }]
    }

    case 'figure': {
      const cls = elem.className ?? ''
      // Ghost kg-image-card: contains a single <img>
      if (cls.includes('kg-image-card')) {
        const img = elem.querySelector('img')
        if (!img) return []
        const src = img.getAttribute('src')
        if (!src) return []
        const uploaded = await uploadImage(src, 'inline')
        const alt = img.getAttribute('alt') ?? elem.querySelector('figcaption')?.textContent ?? ''
        return [{ type: 'image', attrs: { src: uploaded, alt, title: alt || null } }]
      }
      // Ghost kg-embed-card: YouTube / Twitter / etc. — skip iframes, keep nothing
      if (cls.includes('kg-embed-card')) return []
      // Generic figure: recurse
      const inner: TNode[] = []
      for (const c of Array.from(elem.childNodes)) inner.push(...await convertNode(c))
      return inner
    }

    case 'div': {
      const cls = elem.className ?? ''
      // Ghost kg-header-card (author bio cards, CTAs): extract text + images
      if (cls.includes('kg-header-card')) {
        const nodes: TNode[] = []
        // Grab heading
        const heading = elem.querySelector('h2.kg-header-card-heading, h3.kg-header-card-heading')
        if (heading?.textContent?.trim()) {
          nodes.push({ type: 'heading', attrs: { level: 3 }, content: [textNode(heading.textContent.trim())] })
        }
        // Grab subheading/bio paragraph
        const sub = elem.querySelector('.kg-header-card-subheading')
        if (sub) {
          const inlines = getInlines(sub)
          if (inlines.length) nodes.push({ type: 'paragraph', content: inlines })
        }
        return nodes
      }
      // Ghost kg-gallery-card: multiple images
      if (cls.includes('kg-gallery-card')) {
        const nodes: TNode[] = []
        for (const img of Array.from(elem.querySelectorAll('img'))) {
          const src = img.getAttribute('src')
          if (src) {
            const uploaded = await uploadImage(src, 'inline')
            const alt = img.getAttribute('alt') ?? ''
            nodes.push({ type: 'image', attrs: { src: uploaded, alt, title: alt || null } })
          }
        }
        return nodes
      }
      // Other kg-cards: skip
      if (cls.includes('kg-card')) return []
      // Generic div: recurse into children
      const inner: TNode[] = []
      for (const c of Array.from(elem.childNodes)) inner.push(...await convertNode(c))
      return inner
    }

    default:
      // Unknown block-ish element: try to extract text as paragraph
      if (['section', 'article', 'aside', 'header', 'footer', 'main'].includes(tag)) {
        const inner: TNode[] = []
        for (const c of Array.from(elem.childNodes)) inner.push(...await convertNode(c))
        return inner
      }
      return []
  }
}

async function listItems(listEl: Element): Promise<TNode[]> {
  const items: TNode[] = []
  for (const li of Array.from(listEl.querySelectorAll(':scope > li'))) {
    const inlines = getInlines(li)
    if (inlines.length) items.push({ type: 'listItem', content: [{ type: 'paragraph', content: inlines }] })
  }
  return items
}

async function htmlToTiptap(html: string): Promise<TNode> {
  const dom = new JSDOM(`<div id="root">${html}</div>`)
  const root = dom.window.document.getElementById('root')!
  const content: TNode[] = []
  for (const child of Array.from(root.childNodes)) {
    content.push(...await convertNode(child as Element))
  }
  if (content.length === 0) content.push({ type: 'paragraph', content: [] })
  return { type: 'doc', content }
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (ADMIN_PROFILE_EMAIL === 'YOUR_ADMIN_EMAIL_HERE') {
    console.error('✗ Set ADMIN_PROFILE_EMAIL at the top of this script before running.')
    process.exit(1)
  }

  // 1. Resolve or create admin profile
  console.log('\n▶ Resolving admin profile…')
  const { data: { users }, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) { console.error('  ✗', listErr.message); process.exit(1) }
  let adminUser = users.find(u => u.email === ADMIN_PROFILE_EMAIL)
  if (!adminUser) {
    console.log(`  ↳ No user found — creating ${ADMIN_PROFILE_EMAIL}…`)
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: ADMIN_PROFILE_EMAIL,
      email_confirm: true,
      user_metadata: { display_name: 'Admin' },
    })
    if (createErr) { console.error('  ✗', createErr.message); process.exit(1) }
    adminUser = created.user
    console.log(`  ✓ Created user: ${ADMIN_PROFILE_EMAIL}`)
  }
  const adminId = adminUser.id

  // Ensure a profile row exists for this user, using the Ghost author data
  await (sb as any).from('profiles').upsert({
    id: adminId,
    slug: 'untold',
    display_name: 'Untold Magazine',
    role: 'admin',
    bio: 'Untold es una revista virtual hecha por el equipo de surglobal.io',
    website: 'https://untold.ink',
    avatar_url: 'https://untoldmag.ghost.io/content/images/2025/02/square-black-1.png',
  }, { onConflict: 'id' })

  console.log(`  ✓ Admin ready: ${ADMIN_PROFILE_EMAIL} (${adminId})`)

  // 3. Fetch Ghost posts
  console.log('\n▶ Fetching Ghost posts…')
  const posts = await fetchAllGhostPosts()
  console.log(`  ✓ ${posts.length} published posts`)

  // 4. Upsert tags
  console.log('\n▶ Upserting tags…')
  const tagMap = new Map<string, { slug: string; names: Record<string, string> }>()
  for (const post of posts) {
    for (const t of post.tags ?? []) {
      if (!t.slug.startsWith('#')) tagMap.set(t.slug, { slug: t.slug, names: { [SOURCE_LOCALE]: t.name } })
    }
  }
  const tagRows = Array.from(tagMap.values())
  const { data: upsertedTags, error: tagErr } = await (sb as any)
    .from('tags')
    .upsert(tagRows, { onConflict: 'slug' })
    .select('id, slug')
  if (tagErr) { console.error('  ✗', tagErr.message); process.exit(1) }
  const tagIdMap: Record<string, string> = {}
  for (const t of upsertedTags) tagIdMap[t.slug] = t.id
  console.log(`  ✓ ${upsertedTags.length} tags ready`)

  // 5. Import posts
  console.log('\n▶ Importing posts…')
  let ok = 0
  let fail = 0

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    process.stdout.write(`  [${i + 1}/${posts.length}] "${post.title}"… `)

    // Upload cover image
    let coverUrl: string | null = null
    if (post.feature_image) {
      coverUrl = await uploadImage(post.feature_image, 'covers')
    }

    // Convert HTML → Tiptap
    let body: TNode = { type: 'doc', content: [{ type: 'paragraph', content: [] }] }
    if (post.html) {
      body = await htmlToTiptap(post.html)
    }

    // Upsert content row
    const { data: content, error: contentErr } = await (sb as any)
      .from('content')
      .upsert({
        author_id: adminId,
        type: 'article',
        slug: post.slug,
        source_locale: SOURCE_LOCALE,
        status: 'published',
        is_featured: post.featured ?? false,
        cover_image_url: coverUrl,
        image_credits: post.feature_image_caption
          ? ghostCaptionToBracketSyntax(post.feature_image_caption)
          : (post.feature_image_alt || null),
        read_time_minutes: post.reading_time || null,
        published_at: post.published_at,
      }, { onConflict: 'slug' })
      .select('id')
      .single()

    if (contentErr) { console.log(`✗ content: ${contentErr.message}`); fail++; continue }

    // Upsert translation
    const excerpt = post.custom_excerpt || post.excerpt?.slice(0, 400) || null
    const { error: transErr } = await (sb as any)
      .from('content_translations')
      .upsert({
        content_id: content.id,
        locale: SOURCE_LOCALE,
        title: post.title,
        excerpt,
        body,
      }, { onConflict: 'content_id,locale' })

    if (transErr) { console.log(`✗ translation: ${transErr.message}`); fail++; continue }

    // Link tags
    const postTagRows = (post.tags ?? [])
      .filter(t => !t.slug.startsWith('#') && tagIdMap[t.slug])
      .map(t => ({ content_id: content.id, tag_id: tagIdMap[t.slug] }))
    if (postTagRows.length) {
      await (sb as any).from('content_tags').upsert(postTagRows, { onConflict: 'content_id,tag_id' })
    }

    console.log('✓')
    ok++
  }

  console.log(`\n✅ Done: ${ok} imported, ${fail} failed.`)
  if (fail) console.log('   Re-run the script to retry failed posts — upserts are idempotent.')
}

main().catch(err => { console.error(err); process.exit(1) })
