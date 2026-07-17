/**
 * Fixes 6 articles wrongly attributed to the generic 'Untold Magazine'/'Elsie Ralston'
 * accounts, confirmed against Ghost's real "Por [Name]" byline text in the post body.
 * 2 already have a matching profile (just reattach); 4 need a brand-new author profile.
 *
 * Also prints the 11 generic-attributed articles where no byline could be confidently
 * detected (mostly the "cartografías del desvío" series) — those are NOT touched here,
 * they need manual review.
 *
 * Dry-run by default — prints what would change. Pass --confirm to actually write.
 *   npx tsx --env-file=.env.local scripts/reattribute-mismatched-authors.ts [--confirm]
 */
import { createClient } from '@supabase/supabase-js'
import { JSDOM } from 'jsdom'

const AUTHOR_EMAIL_DOMAIN = 'authors.untold.ink'
const GHOST_URL = 'https://untoldmag.ghost.io'
const GHOST_API_KEY = '2b1630029948b2da335b2b5c5e'

function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── Author-card extraction (same as scripts/import-ghost-authors.ts) ────────────

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
  return parts.join('').replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '')
}

interface AuthorCard {
  imageUrl: string | null
  bio: string | null
  bioHtml: string | null
  bioHeading: string | null
  bioCTAUrl: string | null
  bioCTALabel: string | null
}

/** Pull the kg-header-card fields (photo, bio, CTA) out of a Ghost post's HTML body. */
function extractAuthorCard(html: string): AuthorCard {
  const dom = new JSDOM(html)
  const doc = dom.window.document

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

  return { imageUrl, bio, bioHtml, bioHeading, bioCTAUrl, bioCTALabel }
}

async function fetchGhostPostHtml(slug: string): Promise<string | null> {
  const url = `${GHOST_URL}/ghost/api/content/posts/slug/${slug}/?key=${GHOST_API_KEY}&formats=html`
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) return null
  const data = await res.json() as any
  return data.posts?.[0]?.html ?? null
}

type Reattribution =
  | { slug: string; authorSlug: string }
  | { slug: string; newAuthor: { displayName: string } }

const REATTRIBUTIONS: Reattribution[] = [
  { slug: 'el-trabajo-en-serie-como-la-ia-nos-esta-robando-la-capacidad-de-pensar', authorSlug: 'cristian-situ' },
  { slug: 'extractivismo-digital', authorSlug: 'elsie-ralston' },
  { slug: 'amazofuturismo', newAuthor: { displayName: 'Aliza Yanes' } },
  { slug: 'el-saber-esta-repartido', newAuthor: { displayName: 'Antoinette Torres Soler' } },
  { slug: 'una-tecnologia-inconveniente-parte-i', newAuthor: { displayName: 'Jorge Camacho' } },
  { slug: 'disenar-lo-que-queda', newAuthor: { displayName: 'María José Campos Runcie' } },
]

// Generic-attributed articles where no byline could be confidently detected — listed
// for manual review only, never auto-changed.
const NEEDS_MANUAL_REVIEW = [
  'cartografias-gonzalobenaventes',
  'cartografias-del-desvio',
  'cartografias-del-desvio-beatriz-ricci-desde-el-sur',
  'cartografias-del-desvio-4',
  'cartografias-del-desvio-3',
  'semillas-de-futuro-transformando-los-sistemas-de-investigacion-en-america-latina-y-el-caribe',
  'disenar-futuros-desde-el-sur',
  'cartografias-del-desvio-paulazoccotti',
  'cartografias-del-desvio-eduardo-marisca-desde-el-sur',
  'cartografias-del-desvio-2',
  'cartografias-del-desvio-5',
]

async function main() {
  const confirm = process.argv.includes('--confirm')
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: content } = await (sb as any).from('content').select('id, slug, author_id')
  const { data: profiles } = await (sb as any).from('profiles').select('id, slug, display_name')
  const contentBySlug = new Map((content ?? []).map((c: any) => [c.slug, c]))
  const profileBySlug = new Map((profiles ?? []).map((p: any) => [p.slug, p]))
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]))

  const { data: { users: existingUsers } } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const usersByEmail = new Map<string, string>(existingUsers.map((u) => [u.email ?? '', u.id] as [string, string]))

  console.log(`${confirm ? 'APPLYING CHANGES' : 'DRY RUN'} — ${REATTRIBUTIONS.length} reattributions\n`)

  for (const r of REATTRIBUTIONS) {
    const contentRow = contentBySlug.get(r.slug) as any
    if (!contentRow) {
      console.log(`✗ ${r.slug}: no content row found — skipping`)
      continue
    }
    const currentAuthor = profileById.get(contentRow.author_id) as any

    if ('authorSlug' in r) {
      const targetProfile = profileBySlug.get(r.authorSlug) as any
      if (!targetProfile) {
        console.log(`✗ ${r.slug}: target profile "@${r.authorSlug}" not found — skipping`)
        continue
      }
      console.log(`${r.slug}`)
      console.log(`  ${currentAuthor?.display_name ?? '(unknown)'} (@${currentAuthor?.slug}) -> ${targetProfile.display_name} (@${targetProfile.slug})`)
      if (confirm) {
        const { error } = await (sb as any).from('content').update({ author_id: targetProfile.id }).eq('id', contentRow.id)
        if (error) console.log(`  ✗ update failed: ${error.message}`)
        else console.log('  ✓ updated')
      }
      continue
    }

    // newAuthor case
    const displayName = r.newAuthor.displayName
    const authorSlug = slugify(displayName)
    const existingBySlug = profileBySlug.get(authorSlug) as any

    const postHtml = await fetchGhostPostHtml(r.slug)
    const card = postHtml ? extractAuthorCard(postHtml) : null

    console.log(`${r.slug}`)
    console.log(`  ${currentAuthor?.display_name ?? '(unknown)'} (@${currentAuthor?.slug}) -> ${displayName} (@${authorSlug})${existingBySlug ? ' [profile already exists]' : ' [NEW profile to be created]'}`)
    console.log(`  photo: ${card?.imageUrl ? card.imageUrl : '(none found in Ghost)'}`)
    console.log(`  bio:   ${card?.bio ? `${card.bio.slice(0, 100)}${card.bio.length > 100 ? '…' : ''}` : '(none found in Ghost)'}`)

    if (!confirm) continue

    let profileId = existingBySlug?.id as string | undefined
    if (!profileId) {
      const email = `${authorSlug}@${AUTHOR_EMAIL_DOMAIN}`
      let userId = usersByEmail.get(email)
      if (!userId) {
        const { data: created, error } = await sb.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { display_name: displayName },
        })
        if (error) {
          console.log(`  ✗ could not create user: ${error.message}`)
          continue
        }
        userId = created.user.id
        usersByEmail.set(email, userId)
      }
      const profileTranslations = card
        ? {
            _source_bio_html: card.bioHtml ?? null,
            _source_bio_heading: card.bioHeading ?? null,
            _source_bio_cta_url: card.bioCTAUrl ?? null,
            _source_bio_cta_label: card.bioCTALabel ?? null,
          }
        : null
      const { error: profileErr } = await (sb as any)
        .from('profiles')
        .upsert(
          {
            id: userId,
            slug: authorSlug,
            display_name: displayName,
            role: 'author',
            avatar_url: card?.imageUrl ?? null,
            bio: card?.bio ?? null,
            ...(profileTranslations ? { profile_translations: profileTranslations } : {}),
          },
          { onConflict: 'id' }
        )
      if (profileErr) {
        console.log(`  ✗ could not create profile: ${profileErr.message}`)
        continue
      }
      profileId = userId
      profileBySlug.set(authorSlug, { id: profileId, slug: authorSlug, display_name: displayName })
    }

    const { error: contentErr } = await (sb as any).from('content').update({ author_id: profileId }).eq('id', contentRow.id)
    if (contentErr) console.log(`  ✗ content update failed: ${contentErr.message}`)
    else console.log('  ✓ updated')
  }

  console.log(`\n--- Needs manual review (no confident byline detected, left unchanged): ${NEEDS_MANUAL_REVIEW.length} ---`)
  for (const slug of NEEDS_MANUAL_REVIEW) {
    const c = contentBySlug.get(slug) as any
    const author = c ? (profileById.get(c.author_id) as any) : null
    console.log(`  ${slug} (currently: ${author?.display_name ?? '(unknown)'})`)
  }

  if (!confirm) {
    console.log('\nDry run only — pass --confirm to write these changes.')
  }
}

main().catch(console.error)
