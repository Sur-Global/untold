/**
 * Import Ghost post authors into Supabase and link them to their articles.
 *
 * Extracts author name, photo, bio (with HTML links), heading, and CTA from
 * each Ghost post's kg-header-card section, creates profiles for unique authors,
 * stores rich bio data in profile_translations._source_*, and updates content.author_id.
 *
 * Run: npx tsx --env-file=.env.local scripts/import-ghost-authors.ts
 */
import { createClient } from '@supabase/supabase-js'
import { JSDOM } from 'jsdom'

const GHOST_URL = 'https://untold.ink'
const GHOST_API_KEY = '2b1630029948b2da335b2b5c5e'
const AUTHOR_EMAIL_DOMAIN = 'authors.untold.ink'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const STARTS_UPPER = /^[A-ZÁÉÍÓÚÑÜÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÇÃÕ]/

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Serialize an element's children to safe HTML preserving only <a> tags with spaces intact. */
function serializeBioHtml(el: Element): string {
  const parts: string[] = []
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      parts.push(escapeHtml(node.textContent ?? ''))
    } else if (node.nodeType === 1 /* ELEMENT_NODE */) {
      const elem = node as Element
      if (elem.tagName === 'A') {
        const href = (elem.getAttribute('href') ?? '').replace(/[?#]ref=[^&#]*/g, '')
        const text = elem.textContent ?? ''
        if (href && text.trim()) {
          parts.push(`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`)
        } else {
          parts.push(escapeHtml(text))
        }
      } else {
        parts.push(serializeBioHtml(elem))
      }
    }
  }
  // Join parts. Only trim regular whitespace (space/tab/newline), NOT NBSP
  return parts.join('').replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '')
}

interface AuthorData {
  name: string | null
  imageUrl: string | null
  bio: string | null
  bioHtml: string | null
  bioHeading: string | null
  bioCTAUrl: string | null
  bioCTALabel: string | null
}

function extractAuthor(html: string): AuthorData {
  const dom = new JSDOM(html)
  const doc = dom.window.document

  let name: string | null = null

  // Strategy 1: look for "Por [Name]" inside a short inline element (em/strong/b/i).
  // The element must START with "Por" (after optional leading dashes).
  for (const el of Array.from(doc.querySelectorAll('em, strong, b, i'))) {
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').replace(/[¿¡]/g, '').trim()
    if (text.length > 100) continue
    if (!/^[-–\s]*[Pp]or\s/i.test(text)) continue
    const candidate = text
      .replace(/^[-–\s]*[Pp]or\s+/i, '')
      .replace(/[,;].*$/g, '')
      .replace(/[-–.*\s]+$/g, '')
      .trim()
    if (!candidate || !STARTS_UPPER.test(candidate) || !candidate.includes(' ')) continue
    if (candidate.split(/\s+/).length > 5) continue
    name = candidate
    break
  }

  // Strategy 2: fallback — body text search with required trailing dash boundary.
  if (!name) {
    const bodyText = (doc.body.textContent ?? '').slice(0, 2000).replace(/[¿¡]/g, '')
    const m = bodyText.match(
      /[-–\s]*[Pp]or\s+([\wÁÉÍÓÚÑÜÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÇÃÕáéíóúñüàèìòùâêîôûäëïöüçãõ]+(?:\s+[\wÁÉÍÓÚÑÜÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÇÃÕáéíóúñüàèìòùâêîôûäëïöüçãõ]+){1,4})[.,*\-–\s]*[-–]/
    )
    if (m && STARTS_UPPER.test(m[1]) && m[1].includes(' ') && m[1].split(/\s+/).length <= 5) {
      name = m[1].trim()
    }
  }

  // kg-header-card fields
  const imgEl = doc.querySelector('.kg-header-card-image') as HTMLImageElement | null
  const imageUrl = imgEl?.getAttribute('src') ?? null

  const headingEl = doc.querySelector('.kg-header-card-heading')
  const bioHeading = headingEl?.textContent?.replace(/\s+/g, ' ').trim() ?? null

  const bioEl = doc.querySelector('.kg-header-card-subheading')
  const bio = bioEl?.textContent?.replace(/\s+/g, ' ').trim() ?? null
  const bioHtml = bioEl ? serializeBioHtml(bioEl) : null

  const ctaEl = doc.querySelector('.kg-header-card-button') as HTMLAnchorElement | null
  const bioCTAUrl = ctaEl?.getAttribute('href')?.replace(/[?#]ref=[^&#]*/g, '') ?? null
  const bioCTALabel = ctaEl?.textContent?.replace(/\s+/g, ' ').trim() ?? null

  return { name, imageUrl, bio, bioHtml, bioHeading, bioCTAUrl, bioCTALabel }
}

async function fetchAllPosts(): Promise<Array<{ slug: string; html: string | null }>> {
  const all: Array<{ slug: string; html: string | null }> = []
  let page = 1
  while (true) {
    const url =
      `${GHOST_URL}/ghost/api/content/posts/` +
      `?key=${GHOST_API_KEY}&formats=html&limit=15&page=${page}&filter=status:published`
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) throw new Error(`Ghost API ${res.status}: ${res.statusText}`)
    const data = await res.json()
    for (const p of data.posts) all.push({ slug: p.slug, html: p.html ?? null })
    if (!data.meta.pagination.next) break
    page++
  }
  return all
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch posts
  console.log('\n▶ Fetching Ghost posts...')
  const posts = await fetchAllPosts()
  console.log(`  ✓ ${posts.length} posts`)

  // 2. Extract author data per post
  console.log('\n▶ Extracting author data...')
  const postAuthors = new Map<string, { name: string; slug: string } & AuthorData>()
  const uniqueAuthors = new Map<string, AuthorData & { name: string }>()
  const noAuthor: string[] = []

  for (const post of posts) {
    if (!post.html) continue
    const data = extractAuthor(post.html)
    if (!data.name) {
      noAuthor.push(post.slug)
      console.log(`  ⚠ No author found: ${post.slug}`)
      continue
    }
    const authorSlug = slugify(data.name)
    postAuthors.set(post.slug, { ...data, name: data.name, slug: authorSlug })

    if (!uniqueAuthors.has(authorSlug)) {
      uniqueAuthors.set(authorSlug, { ...data, name: data.name })
    } else {
      const existing = uniqueAuthors.get(authorSlug)!
      if (!existing.imageUrl && data.imageUrl) existing.imageUrl = data.imageUrl
      if (!existing.bio && data.bio) existing.bio = data.bio
      if (!existing.bioHtml && data.bioHtml) existing.bioHtml = data.bioHtml
      if (!existing.bioHeading && data.bioHeading) existing.bioHeading = data.bioHeading
      if (!existing.bioCTAUrl && data.bioCTAUrl) existing.bioCTAUrl = data.bioCTAUrl
      if (!existing.bioCTALabel && data.bioCTALabel) existing.bioCTALabel = data.bioCTALabel
    }
  }
  console.log(`  ✓ ${uniqueAuthors.size} unique authors found across ${postAuthors.size} posts`)

  // 3. Load existing auth users and profiles
  console.log('\n▶ Loading existing accounts...')
  const { data: { users: existingUsers } } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const usersByEmail = new Map(existingUsers.map(u => [u.email ?? '', u.id]))

  const { data: existingProfiles } = await (sb as any)
    .from('profiles')
    .select('id, slug')
  const profileIdBySlug = new Map<string, string>(
    (existingProfiles ?? []).map((p: any) => [p.slug, p.id])
  )

  // 4. Upsert profiles and store rich bio data
  console.log('\n▶ Creating/updating author profiles...')
  const authorProfileId = new Map<string, string>()

  for (const [authorSlug, author] of uniqueAuthors) {
    let profileId = profileIdBySlug.get(authorSlug)

    if (!profileId) {
      const email = `${authorSlug}@${AUTHOR_EMAIL_DOMAIN}`
      let userId = usersByEmail.get(email)

      if (!userId) {
        const { data: created, error } = await sb.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { display_name: author.name },
        })
        if (error) {
          console.log(`  ✗ Could not create user for "${author.name}": ${error.message}`)
          continue
        }
        userId = created.user.id
      }
      profileId = userId
    }

    // Build profile_translations with source bio fields stored under _source_* keys
    const profileTranslations: Record<string, any> = {
      _source_bio_html: author.bioHtml ?? null,
      _source_bio_heading: author.bioHeading ?? null,
      _source_bio_cta_url: author.bioCTAUrl ?? null,
      _source_bio_cta_label: author.bioCTALabel ?? null,
    }

    const { error } = await (sb as any)
      .from('profiles')
      .upsert(
        {
          id: profileId,
          slug: authorSlug,
          display_name: author.name,
          role: 'author',
          avatar_url: author.imageUrl ?? null,
          bio: author.bio ?? null,
          profile_translations: profileTranslations,
        },
        { onConflict: 'id' }
      )

    if (error) {
      console.log(`  ✗ Profile upsert failed for "${author.name}": ${error.message}`)
      continue
    }

    authorProfileId.set(authorSlug, profileId)
    const hasBio = !!author.bioHtml
    const hasCTA = !!author.bioCTAUrl
    console.log(`  ✓ ${author.name}  [${authorSlug}]${hasBio ? ' +bio' : ''}${hasCTA ? ' +cta' : ''}`)
  }

  // 5. Link articles to authors
  console.log('\n▶ Linking articles to authors...')
  let ok = 0
  let skipped = 0

  for (const [postSlug, author] of postAuthors) {
    const profileId = authorProfileId.get(author.slug)
    if (!profileId) {
      console.log(`  ⚠ No profile for "${author.name}", skipping: ${postSlug}`)
      skipped++
      continue
    }

    const { error } = await (sb as any)
      .from('content')
      .update({ author_id: profileId })
      .eq('slug', postSlug)
      .eq('type', 'article')

    if (error) {
      console.log(`  ✗ ${postSlug}: ${error.message}`)
    } else {
      ok++
    }
  }

  console.log(`\n✅ Done: ${ok} articles linked, ${skipped} skipped.`)

  if (noAuthor.length > 0) {
    console.log(`\n⚠  ${noAuthor.length} articles with no extractable author (need manual assignment):`)
    for (const slug of noAuthor) console.log(`   • ${slug}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
