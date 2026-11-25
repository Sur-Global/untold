import { createClient } from '@supabase/supabase-js'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Find amazofuturismo article
  const { data: slugSearch } = await (sb as any)
    .from('content')
    .select('id, slug, status, type')
    .ilike('slug', '%amazo%')
  console.log('Slug search:', JSON.stringify(slugSearch, null, 2))

  // Also check a sample of all article bodies to see if they're populated
  const { data: sample } = await (sb as any)
    .from('content_translations')
    .select('id, locale, title, body')
    .eq('locale', 'es')
    .limit(5)

  console.log('\nSample bodies:')
  for (const t of sample ?? []) {
    const nodeCount = Array.isArray(t.body?.content) ? t.body.content.length : 0
    console.log(`  "${t.title?.slice(0, 50)}" → ${nodeCount} nodes`)
  }

  // Check all es translations for empty bodies
  const { data: allEs } = await (sb as any)
    .from('content_translations')
    .select('id, title, body')
    .eq('locale', 'es')

  const empty = (allEs ?? []).filter((t: any) => !Array.isArray(t.body?.content) || t.body.content.length === 0)
  console.log(`\nTotal ES translations: ${allEs?.length ?? 0}`)
  console.log(`Empty bodies: ${empty.length}`)
  if (empty.length > 0) {
    console.log('Empty:', empty.map((t: any) => t.title?.slice(0, 60)))
  }
}

main().catch(console.error)
