import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const byline: Record<string, string> = JSON.parse(readFileSync('/tmp/ghost_byline.json', 'utf-8'))

  const { data: content } = await (sb as any)
    .from('content')
    .select('slug, author_id')
  const { data: profiles } = await (sb as any)
    .from('profiles')
    .select('id, slug, display_name')

  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]))
  const profileByName = new Map((profiles ?? []).map((p: any) => [p.display_name.toLowerCase(), p]))
  const contentBySlug = new Map((content ?? []).map((c: any) => [c.slug, c]))

  let mismatches = 0
  let matches = 0
  let noProfile = 0
  for (const [slug, ghostAuthor] of Object.entries(byline)) {
    const c = contentBySlug.get(slug)
    if (!c) { console.log(`  [no content row] ${slug}`); continue }
    const currentProfile = profileById.get((c as any).author_id) as any
    const currentName = currentProfile?.display_name ?? '(unknown)'
    const norm = (s: string) => s.toLowerCase().trim()
    if (norm(currentName) === norm(ghostAuthor)) {
      matches++
      continue
    }
    // does a profile exist for the ghost byline name at all?
    const candidateProfile = profileByName.get(norm(ghostAuthor)) as any
    mismatches++
    console.log(`MISMATCH  ${slug}`)
    console.log(`   currently attributed to: ${currentName} (@${currentProfile?.slug})`)
    console.log(`   ghost byline says:       ${ghostAuthor}${candidateProfile ? ` -> profile EXISTS (@${candidateProfile.slug})` : ' -> NO MATCHING PROFILE'}`)
    if (!candidateProfile) noProfile++
  }

  console.log(`\n--- Summary ---`)
  console.log(`Matches (already correct): ${matches}`)
  console.log(`Mismatches: ${mismatches}`)
  console.log(`  of which have no existing profile at all: ${noProfile}`)
}

main().catch(console.error)
