import { createClient } from '@supabase/supabase-js'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: content } = await (sb as any)
    .from('content')
    .select('id, slug, type, status, author_id, image_credits, cover_image_url')
    .order('slug')

  const { data: profiles } = await (sb as any)
    .from('profiles')
    .select('id, slug, display_name, role, avatar_url')

  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]))

  console.log(`Total content rows: ${content?.length ?? 0}`)
  console.log(`Total profiles: ${profiles?.length ?? 0}`)

  // --- Image credits coverage ---
  const withCover = (content ?? []).filter((c: any) => c.cover_image_url)
  const missingCredit = withCover.filter((c: any) => !c.image_credits || !c.image_credits.trim())
  console.log(`\n--- Cover image credits ---`)
  console.log(`Content with a cover image: ${withCover.length}`)
  console.log(`Missing image_credits: ${missingCredit.length}`)
  if (missingCredit.length) {
    console.log('Examples (up to 15):')
    for (const c of missingCredit.slice(0, 15)) console.log(`  [${c.type}] ${c.slug}`)
  }

  // --- Author linkage sanity ---
  console.log(`\n--- Author linkage ---`)
  const missingProfile = (content ?? []).filter((c: any) => !profileById.has(c.author_id))
  console.log(`Content whose author_id has no matching profile: ${missingProfile.length}`)
  for (const c of missingProfile.slice(0, 15)) console.log(`  ${c.slug} → author_id ${c.author_id}`)

  const countsByAuthor = new Map<string, number>()
  for (const c of content ?? []) {
    countsByAuthor.set(c.author_id, (countsByAuthor.get(c.author_id) ?? 0) + 1)
  }
  console.log(`\nArticles per author:`)
  for (const [id, count] of [...countsByAuthor.entries()].sort((a, b) => b[1] - a[1])) {
    const p = profileById.get(id) as any
    console.log(`  ${count}\t${p ? `${p.display_name} (@${p.slug}, role=${p.role})` : `[missing profile] ${id}`}`)
  }

  // --- Look for likely duplicate author profiles (similar slugs) ---
  console.log(`\n--- Possible duplicate profiles (similar slug prefix) ---`)
  const slugs = (profiles ?? []).map((p: any) => p.slug).sort()
  for (let i = 0; i < slugs.length - 1; i++) {
    if (slugs[i + 1].startsWith(slugs[i]) || slugs[i].startsWith(slugs[i + 1])) {
      console.log(`  ${slugs[i]}  <->  ${slugs[i + 1]}`)
    }
  }

  // --- Profiles missing avatar ---
  const missingAvatar = (profiles ?? []).filter((p: any) => !p.avatar_url && p.role !== 'user')
  console.log(`\n--- Author/editor/admin profiles missing an avatar: ${missingAvatar.length} ---`)
  for (const p of missingAvatar) console.log(`  @${p.slug} (${p.display_name})`)
}

main().catch(console.error)
