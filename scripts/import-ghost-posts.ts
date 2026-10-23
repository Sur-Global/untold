/**
 * Imports Ghost posts that are not on the platform yet, in the editor's current (BlockNote) format:
 *   - photo captions (figcaption / <small> / italic line under the photo) become the image caption,
 *     links inside them use the `[label](url)` syntax the reader turns into hyperlinks
 *   - footnotes keep their superscript numbers in the text and become a numbered list at the end
 *   - the "Referencias" toggle becomes a collapsible block with one bullet per reference
 *   - headings, quotes, lists, bold/italic and links are kept; the author card becomes a profile
 *
 * Dry run (prints what would be written):  npx tsx --env-file=.env.local scripts/import-ghost-posts.ts
 * Write it to the database:                npx tsx --env-file=.env.local scripts/import-ghost-posts.ts --apply
 */
import { createClient } from '@supabase/supabase-js'
import { JSDOM } from 'jsdom'
import { randomUUID } from 'node:crypto'
import { hostImage, isExternalImage } from './lib/host-image'

const GHOST_URL = 'https://untoldmag.ghost.io'
const GHOST_API_KEY = '2b1630029948b2da335b2b5c5e'
const SOURCE_LOCALE = 'es'
const AUTHOR_EMAIL_DOMAIN = 'authors.untold.ink'
const APPLY = process.argv.includes('--apply')

/** Who each post is by (name on the profile). For the "Cartografías del Desvío" interviews, the person interviewed. */
const AUTHOR_BY_POST: Record<string, string> = {
  'justicia-linguistica-y-el-giro-pluriversal': 'Yecid Ortega',
  'la-mano-que-mueve-la-pluma': 'Carlos Fuller Maúrtua',
  'derecho-a-la-educacion-y-justicia-linguistica-en-comunidades-indigenas': 'Lorena Córdova-Hernández',
  'la-crisis-de-imaginacion-y-las-noticias-que-futuros-son-posibles': 'Mercedes Baltazar',
  'viejos-mitos-nuevas-amenazas': 'Javier Wong Q',
  'cartografias-del-desvio-6': 'Zoila Ochoa Garay',
  'cartografias-del-desvio-mara': 'Mara Gourd-Mercado',
}

/** Ghost tag slug → tag on the platform (names in every language; used only for tags that do not exist yet). */
const TAGS: Record<string, { slug: string; names: Record<string, string> }> = {
  entrevista: { slug: 'entrevista', names: { es: 'entrevista', en: 'interview', pt: 'entrevista', fr: 'entretien', de: 'Interview', da: 'interview' } },
  soberania: { slug: 'soberania', names: { es: 'soberanía', en: 'sovereignty', pt: 'soberania', fr: 'souveraineté', de: 'Souveränität', da: 'suverænitet' } },
  // Ghost's slug and name are both misspelled ("resistecia")
  resistecia: { slug: 'resistencia', names: { es: 'resistencia', en: 'resistance', pt: 'resistência', fr: 'résistance', de: 'Widerstand', da: 'modstand' } },
  'justicia-linguistica': { slug: 'justicia-linguistica', names: { es: 'justicia lingüística', en: 'linguistic justice', pt: 'justiça linguística', fr: 'justice linguistique', de: 'Sprachgerechtigkeit', da: 'sproglig retfærdighed' } },
  pluriverso: { slug: 'pluriverso', names: { es: 'pluriverso', en: 'pluriverse', pt: 'pluriverso', fr: 'pluriverse', de: 'Pluriversum', da: 'pluriverset' } },
  medios: { slug: 'medios', names: { es: 'medios', en: 'media', pt: 'mídia', fr: 'médias', de: 'Medien', da: 'medier' } },
  literatura: { slug: 'literatura', names: { es: 'literatura', en: 'literature', pt: 'literatura', fr: 'littérature', de: 'Literatur', da: 'litteratur' } },
  editorial: { slug: 'editorial', names: { es: 'editorial', en: 'editorial', pt: 'editorial', fr: 'éditorial', de: 'Editorial', da: 'leder' } },
  imaginacion: { slug: 'imaginacion', names: { es: 'imaginación', en: 'imagination', pt: 'imaginação', fr: 'imagination', de: 'Imagination', da: 'forestillingsevne' } },
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Ghost ─────────────────────────────────────────────────────────────────────

interface GhostPost {
  id: string; slug: string; title: string; html: string | null
  feature_image: string | null; feature_image_alt: string | null; feature_image_caption: string | null
  custom_excerpt: string | null; reading_time: number; published_at: string; featured: boolean
  tags: { slug: string; name: string }[]
}

export async function fetchAllGhostPosts(): Promise<GhostPost[]> {
  const all: GhostPost[] = []
  for (let page = 1; ; page++) {
    const url = `${GHOST_URL}/ghost/api/content/posts/?key=${GHOST_API_KEY}&include=tags&formats=html&limit=15&page=${page}&filter=status:published`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Ghost API ${res.status}: ${res.statusText}`)
    const data = (await res.json()) as any
    all.push(...data.posts)
    if (!data.meta.pagination.next) break
  }
  return all
}

// ── HTML → BlockNote ──────────────────────────────────────────────────────────

type Styles = { bold?: true; italic?: true; underline?: true; strike?: true; code?: true }
type TextItem = { type: 'text'; text: string; styles: Styles }
type LinkItem = { type: 'link'; href: string; content: TextItem[] }
type Inline = TextItem | LinkItem
type Block = {
  id: string; type: string; props: Record<string, unknown>
  content?: Inline[]; children: Block[]
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const toSuperscript = (n: string) => n.replace(/\d/g, (d) => SUPERSCRIPT[Number(d)])

function cleanHref(raw: string): string {
  // Ghost tags every outgoing link with ?ref=untold.ink — drop that tracking parameter
  try {
    const url = new URL(raw)
    if (url.searchParams.get('ref') === 'untold.ink') url.searchParams.delete('ref')
    return url.toString()
  } catch {
    return raw
  }
}

const sameStyles = (a: Styles, b: Styles) => JSON.stringify(a) === JSON.stringify(b)

function pushText(out: Inline[], text: string, styles: Styles) {
  if (!text) return
  const last = out[out.length - 1]
  if (last?.type === 'text' && sameStyles(last.styles, styles)) last.text += text
  else out.push({ type: 'text', text, styles: { ...styles } })
}

function inlineOf(node: Node, styles: Styles, inLink: boolean, out: Inline[]): void {
  if (node.nodeType === 3) {
    const text = (node.textContent ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ')
    pushText(out, text, styles)
    return
  }
  if (node.nodeType !== 1) return
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  const cls = el.getAttribute('class') ?? ''

  if (tag === 'sup' && cls.includes('footnote-ref')) {
    const num = (el.textContent ?? '').match(/\d+/)?.[0]
    if (num) pushText(out, toSuperscript(num), styles)
    return
  }
  if (cls.includes('footnote-backref')) return
  if (tag === 'br') { pushText(out, '\n', styles); return }
  if (tag === 'img' || tag === 'svg' || tag === 'button') return

  const next: Styles = { ...styles }
  if (tag === 'strong' || tag === 'b') next.bold = true
  else if (tag === 'em' || tag === 'i') next.italic = true
  else if (tag === 'u' && !inLink) next.underline = true
  else if (tag === 's' || tag === 'del') next.strike = true
  else if (tag === 'code') next.code = true

  if (tag === 'a') {
    const href = cleanHref(el.getAttribute('href') ?? '')
    if (!href || href.startsWith('#')) {
      for (const child of Array.from(el.childNodes)) inlineOf(child, next, inLink, out)
      return
    }
    const inner: Inline[] = []
    for (const child of Array.from(el.childNodes)) inlineOf(child, next, true, inner)
    const content = inner.filter((i): i is TextItem => i.type === 'text')
    if (content.length) out.push({ type: 'link', href, content })
    return
  }
  for (const child of Array.from(el.childNodes)) inlineOf(child, next, inLink, out)
}

export function inlineChildren(el: Element): Inline[] {
  const out: Inline[] = []
  for (const child of Array.from(el.childNodes)) inlineOf(child, {}, false, out)
  // trim the block's edges (and the spaces around line breaks)
  const first = out[0]; if (first?.type === 'text') first.text = first.text.replace(/^\s+/, '')
  const last = out[out.length - 1]; if (last?.type === 'text') last.text = last.text.replace(/\s+$/, '')
  for (const item of out) if (item.type === 'text') item.text = item.text.replace(/ ?\n ?/g, '\n')
  return out.filter((i) => i.type === 'link' || i.text.length > 0)
}

const plain = (items: Inline[]) =>
  items.map((i) => (i.type === 'text' ? i.text : i.content.map((c) => c.text).join(''))).join('')

/** Caption text: plain, with hyperlinks written as [label](url) like the editor's photo credit field. */
export const captionOf = (items: Inline[]) =>
  items
    .map((i) => (i.type === 'text' ? i.text : `[${i.content.map((c) => c.text).join('').trim()}](${i.href})`))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

const block = (type: string, props: Record<string, unknown> = {}, content?: Inline[], children: Block[] = []): Block => ({
  id: randomUUID(),
  type,
  // A quote has no text alignment: an unknown prop makes the reader crash
  props:
    type === 'quote'
      ? { textColor: 'default', backgroundColor: 'default', ...props }
      : ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'toggleListItem'].includes(type)
        ? { textColor: 'default', textAlignment: 'left', backgroundColor: 'default', ...props }
        : props,
  ...(content ? { content } : {}),
  children,
})

const isJunkAlt = (alt: string) => !alt || /^undefined$/i.test(alt) || /\.(jpe?g|png|webp|gif)$/i.test(alt) || alt.length < 4

function imageBlock(src: string, alt: string, caption: string): Block {
  return block('image', {
    url: src,
    name: caption || isJunkAlt(alt) ? '' : alt.trim(),
    caption,
    showPreview: true,
    textAlignment: 'center',
    backgroundColor: 'default',
  })
}

/** True when the whole paragraph is one italic run (the caption a writer typed under a photo). */
function isItalicOnly(p: Element): boolean {
  const items = inlineChildren(p)
  return items.length > 0 && items.every((i) => (i.type === 'text' ? !!i.styles.italic : i.content.every((c) => !!c.styles.italic)))
}

/** Footnotes come out of Ghost as "…subordinado.<link>" with no space; give the link room to breathe. */
function spaceBeforeLinks(items: Inline[]): Inline[] {
  items.forEach((item, i) => {
    const prev = items[i - 1]
    if (item.type === 'link' && prev?.type === 'text' && /[^\s(\[«“"']$/.test(prev.text)) prev.text += ' '
  })
  return items
}

function listItemBlocks(list: Element, ordered: boolean): Block[] {
  const blocks: Block[] = []
  for (const li of Array.from(list.querySelectorAll(':scope > li'))) {
    const items = ordered ? spaceBeforeLinks(inlineChildren(li)) : inlineChildren(li)
    if (items.length) blocks.push(block(ordered ? 'numberedListItem' : 'bulletListItem', {}, items))
  }
  return blocks
}

function toggleBlock(card: Element): Block {
  const title = inlineChildren(card.querySelector('.kg-toggle-heading-text') ?? card)
  const content = card.querySelector('.kg-toggle-content')
  const children: Block[] = []
  for (const el of Array.from(content?.children ?? [])) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'ul' || tag === 'ol') children.push(...listItemBlocks(el, false))
    else {
      const items = inlineChildren(el)
      if (items.length) children.push(block('bulletListItem', {}, items))
    }
  }
  return block('toggleListItem', {}, title, children)
}

export function convert(parent: Element): Block[] {
  const out: Block[] = []
  const kids = Array.from(parent.children)
  for (let i = 0; i < kids.length; i++) {
    const el = kids[i]
    const tag = el.tagName.toLowerCase()
    const cls = el.getAttribute('class') ?? ''

    if (cls.includes('kg-header-card')) continue // author card → profile
    if (cls.includes('kg-toggle-card')) { out.push(toggleBlock(el)); continue }
    if (tag === 'figure') {
      const img = el.querySelector('img')
      if (img?.getAttribute('src')) {
        const cap = el.querySelector('figcaption')
        out.push(imageBlock(img.getAttribute('src')!, img.getAttribute('alt') ?? '', cap ? captionOf(inlineChildren(cap)) : ''))
      }
      continue
    }
    if (tag === 'hr') { out.push(block('divider')); continue }
    if (tag === 'section' && cls.includes('footnotes')) {
      for (const list of Array.from(el.querySelectorAll('ol'))) out.push(...listItemBlocks(list, true))
      continue
    }
    if (tag === 'p') {
      const img = el.querySelector('img')
      if (img?.getAttribute('src')) {
        // photo, then its caption: <br><small>…</small> / <em>…</em> in the same paragraph, or an italic paragraph after it
        const clone = el.cloneNode(true) as Element
        clone.querySelectorAll('img').forEach((n) => n.remove())
        let caption = captionOf(inlineChildren(clone))
        if (!caption) {
          const nxt = kids[i + 1]
          if (nxt?.tagName.toLowerCase() === 'p' && isItalicOnly(nxt) && plain(inlineChildren(nxt)).length <= 350) {
            caption = captionOf(inlineChildren(nxt))
            i++
          }
        }
        out.push(imageBlock(img.getAttribute('src')!, img.getAttribute('alt') ?? '', caption))
        continue
      }
      const items = inlineChildren(el)
      if (plain(items).trim()) out.push(block('paragraph', {}, items))
      continue
    }
    if (/^h[1-6]$/.test(tag)) {
      const items = inlineChildren(el)
      if (plain(items).trim()) out.push(block('heading', { level: Math.min(Number(tag[1]), 3), isToggleable: false }, items))
      continue
    }
    if (tag === 'blockquote') {
      const items = inlineChildren(el)
      if (plain(items).trim()) out.push(block('quote', {}, items))
      continue
    }
    if (tag === 'ul' || tag === 'ol') { out.push(...listItemBlocks(el, tag === 'ol')); continue }
    if (['div', 'section', 'article'].includes(tag)) { out.push(...convert(el)); continue }
  }
  return out
}

// ── Author card ───────────────────────────────────────────────────────────────

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function bioHtml(el: Element): string {
  return Array.from(el.childNodes)
    .map((n) => {
      if (n.nodeType === 3) return escapeHtml(n.textContent ?? '')
      if (n.nodeType !== 1) return ''
      const e = n as Element
      if (e.tagName === 'A') {
        const href = cleanHref(e.getAttribute('href') ?? '')
        const text = e.textContent ?? ''
        return href && text.trim() ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>` : escapeHtml(text)
      }
      return bioHtml(e)
    })
    .join('')
    .replace(/ /g, ' ')
    .replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '')
}

const stripLinkedInTracking = (url: string) => cleanHref(url).replace(/[?&]lipi=[^&]*/, '').replace(/\?&/, '?').replace(/\?$/, '')

function readAuthorCard(doc: Document) {
  const text = (sel: string) => doc.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() || null
  const bioEl = doc.querySelector('.kg-header-card-subheading')
  const cta = doc.querySelector('.kg-header-card-button')
  return {
    imageUrl: doc.querySelector('.kg-header-card-image')?.getAttribute('src') ?? null,
    heading: text('.kg-header-card-heading'),
    bio: bioEl?.textContent?.replace(/ /g, ' ').replace(/\s+/g, ' ').trim() || null,
    bioHtml: bioEl ? bioHtml(bioEl) : null,
    ctaLabel: cta?.textContent?.replace(/\s+/g, ' ').trim() || null,
    ctaUrl: cta?.getAttribute('href') ? stripLinkedInTracking(cta.getAttribute('href')!) : null,
  }
}

// ── Excerpt, checks ───────────────────────────────────────────────────────────

function makeExcerpt(post: GhostPost, blocks: Block[]): string | null {
  if (post.custom_excerpt) return post.custom_excerpt
  const para = blocks.find((b) => {
    if (b.type !== 'paragraph') return false
    const t = plain(b.content ?? []).trim()
    return t.length >= 80 && !/^[-–\s]*por\s/i.test(t)
  })
  if (!para) return null
  const t = plain(para.content!).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, '').replace(/\s+/g, ' ').trim()
  if (t.length <= 300) return t
  const cut = t.slice(0, 300)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…'
}

const blockText = (b: Block): string =>
  [plain(b.content ?? []), b.type === 'image' ? String(b.props.caption ?? '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') : '', ...b.children.map(blockText)].join('')

const squash = (s: string) => s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '').replace(/\s+/g, '')

/** What a reader would see in the source article (without the author card, footnote arrows, toggle icon). */
function sourceText(root: Element): string {
  const clone = root.cloneNode(true) as Element
  clone.querySelectorAll('.kg-header-card, button, svg, .footnote-backref, sup.footnote-ref').forEach((n) => n.remove())
  return clone.textContent ?? ''
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(APPLY ? '▶ WRITING to the database' : '▶ DRY RUN (nothing is written; add --apply to write)')
  const { data: existing } = await (sb as any).from('content').select('slug')
  const have = new Set((existing ?? []).map((r: any) => r.slug))
  // INCLUDE=slug,slug previews posts that are already on the platform (dry run only — a real run would overwrite them)
  const include = new Set((process.env.INCLUDE ?? '').split(',').filter(Boolean))
  if (APPLY && include.size) throw new Error('INCLUDE can only be used in a dry run')
  const posts = (await fetchAllGhostPosts()).filter((p) => !have.has(p.slug) || include.has(p.slug)).sort((a, b) => a.published_at.localeCompare(b.published_at))
  console.log(`Posts to import: ${posts.length}`)
  if (!posts.length) return

  const { data: profiles } = await (sb as any).from('profiles').select('id, slug, display_name')
  const slugify = (n: string) => n.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const profileBySlug = new Map<string, string>((profiles ?? []).map((p: any) => [p.slug, p.id]))
  const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const userByEmail = new Map(users.map((u) => [u.email ?? '', u.id]))
  const { data: dbTags } = await (sb as any).from('tags').select('id, slug, names')
  const tagBySlug = new Map<string, { id: string; names: Record<string, string> }>((dbTags ?? []).map((t: any) => [t.slug, t]))

    const { data: series } = await (sb as any).from('content').select('id').eq('slug', 'cartografias-del-desvio-5').single()
  const { data: seriesTr } = await (sb as any).from('content_translations').select('excerpt').eq('content_id', series.id).eq('locale', SOURCE_LOCALE).single()

  for (const post of posts) {
    const doc = new JSDOM(`<div id="root">${post.html ?? ''}</div>`).window.document
    const root = doc.getElementById('root')!
    const blocks = convert(root)
    while (blocks[blocks.length - 1]?.type === 'divider') blocks.pop() // nothing follows it
    const card = readAuthorCard(doc)
    const isInterview = /^cartografias-del-desvio/.test(post.slug)
    const authorName = AUTHOR_BY_POST[post.slug]
    if (!authorName) throw new Error(`No author mapped for ${post.slug} — add it to AUTHOR_BY_POST`)

    // The cover photo's credit ("Foto de portada: …", at the end of the text in Ghost) goes under the cover, in the credit field
    let coverCredit: string | null = null
    const creditIdx = blocks.findIndex((b) => b.type === 'paragraph' && /^(foto|imagen) de portada|^portada:/i.test(plain(b.content ?? []).trim()))
    if (creditIdx >= 0) {
      coverCredit = captionOf(blocks[creditIdx].content ?? [])
      blocks.splice(creditIdx, 1)
      while (blocks[blocks.length - 1]?.type === 'divider') blocks.pop()
    }

    // The interview series shares its intro line (the first paragraph of the earlier excerpt)
    const excerpt = isInterview ? ((seriesTr?.excerpt ?? '').split('\n')[0].trim() || null) : makeExcerpt(post, blocks)
    const images = blocks.filter((b) => b.type === 'image')
    const notes = blocks.filter((b) => b.type === 'numberedListItem').length
    const markers = (JSON.stringify(blocks).match(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g) ?? []).length
    const srcLen = squash(sourceText(root)).length
    const outLen = squash(blocks.map(blockText).join('') + (coverCredit ?? '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')).length

    console.log(`\n══ ${post.title}  [${post.slug}]  ${post.published_at.slice(0, 10)}`)
    console.log(`   author: ${authorName}  | card: "${card.heading}" cta: ${card.ctaLabel ?? '-'} ${card.ctaUrl ?? ''}`)
    console.log(`   cover credit: ${coverCredit ?? '-'}`)
    console.log(`   tags: ${post.tags.map((t) => TAGS[t.slug]?.slug ?? `?${t.slug}`).join(', ')}`)
    console.log(`   excerpt: ${excerpt}`)
    console.log(`   blocks: ${blocks.length} | images: ${images.length} (captions: ${images.filter((b) => b.props.caption).length}) | footnote markers: ${markers} / notes: ${notes}`)
    console.log(`   text check: source ${srcLen} chars vs imported ${outLen} chars (${srcLen === outLen ? 'identical' : `DIFFERENT by ${outLen - srcLen}`})`)
    if (!APPLY || process.env.OUTLINE) {
      blocks.forEach((b, i) => {
        const extra = b.type === 'image' ? ` caption="${String(b.props.caption).slice(0, 90)}" name="${String(b.props.name).slice(0, 30)}"` : b.type === 'heading' ? ` h${b.props.level}` : ''
        const kids = b.children.length ? ` [+${b.children.length} children]` : ''
        console.log(`   ${String(i).padStart(2)} ${b.type}${extra}${kids} | ${plain(b.content ?? []).slice(0, 80).replace(/\n/g, '⏎')}`)
      })
    }
    if (!APPLY) continue

    // ── author profile ─────────────────────────────────────────────────────
    let authorId: string
    {
      const slug = slugify(authorName)
      let id = profileBySlug.get(slug) ?? null
      if (!id) {
        const email = `${slug}@${AUTHOR_EMAIL_DOMAIN}`
        let userId = userByEmail.get(email)
        if (!userId) {
          const { data: created, error } = await sb.auth.admin.createUser({ email, email_confirm: true, user_metadata: { display_name: authorName } })
          if (error) throw new Error(`createUser ${authorName}: ${error.message}`)
          userId = created.user.id
        }
        const { error } = await (sb as any).from('profiles').upsert({
          id: userId, slug, display_name: authorName, role: 'author',
          avatar_url: isExternalImage(card.imageUrl) ? await hostImage(card.imageUrl, 'avatar', userId) : card.imageUrl,
          bio: card.bio,
          bio_cta_label: card.ctaLabel, bio_cta_url: card.ctaUrl,
          profile_translations: {
            _source_bio_html: card.bioHtml, _source_bio_heading: card.heading,
            _source_bio_cta_url: card.ctaUrl, _source_bio_cta_label: card.ctaLabel,
          },
        }, { onConflict: 'id' })
        if (error) throw new Error(`profile ${authorName}: ${error.message}`)
        profileBySlug.set(slug, userId)
        id = userId
        console.log(`   ✓ profile created: ${authorName} [${slug}]`)
      } else console.log(`   · profile exists: ${authorName}`)
      authorId = id
    }

    // ── photos: copy them into the platform's own storage ───────────────────
    const coverUrl = isExternalImage(post.feature_image) ? await hostImage(post.feature_image, 'cover', authorId) : post.feature_image
    for (const b of blocks) {
      const photos = (function find(list: Block[]): Block[] { return list.flatMap((x) => [...(x.type === 'image' ? [x] : []), ...find(x.children)]) })([b])
      for (const img of photos) if (isExternalImage(img.props.url as string)) img.props.url = await hostImage(img.props.url as string, 'content', authorId)
    }

    // ── tags ───────────────────────────────────────────────────────────────
    const tagIds: string[] = []
    for (const t of post.tags.filter((t) => !t.slug.startsWith('#'))) {
      const def = TAGS[t.slug]
      if (!def) throw new Error(`Unmapped tag ${t.slug}`)
      const current = tagBySlug.get(def.slug)
      if (!current) {
        const { data, error } = await (sb as any).from('tags').insert({ slug: def.slug, names: def.names }).select('id, names').single()
        if (error) throw new Error(`tag ${def.slug}: ${error.message}`)
        tagBySlug.set(def.slug, data)
        tagIds.push(data.id)
        console.log(`   ✓ tag created: ${def.slug}`)
      } else {
        // fill in only the languages the tag does not have yet
        const missing = Object.entries(def.names).filter(([l]) => !current.names?.[l])
        if (missing.length) {
          const names = { ...(current.names ?? {}), ...Object.fromEntries(missing) }
          await (sb as any).from('tags').update({ names }).eq('id', current.id)
          current.names = names
        }
        tagIds.push(current.id)
      }
    }

    // ── content ────────────────────────────────────────────────────────────
    const { data: content, error } = await (sb as any).from('content').upsert({
      author_id: authorId, type: 'article', slug: post.slug, source_locale: SOURCE_LOCALE, status: 'published',
      is_curated: true, is_featured: post.featured ?? false,
      cover_image_url: coverUrl ?? null,
      image_credits: post.feature_image_caption
        ? captionOf(inlineChildren(new JSDOM(`<p>${post.feature_image_caption}</p>`).window.document.querySelector('p')!))
        : coverCredit ?? (post.feature_image_alt || null),
      read_time_minutes: post.reading_time || null, published_at: post.published_at,
    }, { onConflict: 'slug' }).select('id').single()
    if (error) throw new Error(`content ${post.slug}: ${error.message}`)

    const { error: trErr } = await (sb as any).from('content_translations').upsert(
      { content_id: content.id, locale: SOURCE_LOCALE, title: post.title, excerpt, body: blocks, is_auto_translated: false },
      { onConflict: 'content_id,locale' },
    )
    if (trErr) throw new Error(`translation ${post.slug}: ${trErr.message}`)
    if (tagIds.length) {
      await (sb as any).from('content_tags').upsert(tagIds.map((tag_id) => ({ content_id: content.id, tag_id })), { onConflict: 'content_id,tag_id' })
    }
    console.log(`   ✓ imported (id ${content.id})`)
  }
  console.log('\nDone.')
}

// Other scripts reuse the converter above; only run the import when this file is the one being executed
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1) })
