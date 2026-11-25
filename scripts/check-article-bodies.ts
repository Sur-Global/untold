import { createClient } from '@supabase/supabase-js'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check all content slugs
  const { data: allContent } = await (sb as any)
    .from('content')
    .select('id, slug, status, type')
    .order('slug')

  console.log(`Total content rows: ${allContent?.length ?? 0}`)
  console.log('\nAll slugs:')
  for (const c of allContent ?? []) {
    console.log(`  [${c.status}] ${c.type} → ${c.slug}`)
  }

  // Check body formats across all ES translations
  const { data: esTranslations } = await (sb as any)
    .from('content_translations')
    .select('id, content_id, title, body')
    .eq('locale', 'es')

  let prosemirrorCount = 0
  let blocknoteCount = 0
  let emptyCount = 0
  let nullCount = 0

  for (const t of esTranslations ?? []) {
    const body = t.body
    if (!body) { nullCount++; continue }
    if (Array.isArray(body)) { blocknoteCount++; continue }
    if (body?.type === 'doc' && Array.isArray(body?.content)) { prosemirrorCount++; continue }
    emptyCount++
  }

  console.log(`\nBody format breakdown (ES translations):`)
  console.log(`  ProseMirror (object): ${prosemirrorCount}`)
  console.log(`  BlockNote (array):    ${blocknoteCount}`)
  console.log(`  null/missing:         ${nullCount}`)
  console.log(`  other/unknown:        ${emptyCount}`)
}

main().catch(console.error)
