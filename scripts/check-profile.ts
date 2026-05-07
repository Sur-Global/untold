import { createClient } from '@supabase/supabase-js'
// Test with anon key (same as server component)
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
async function main() {
  const { data, error } = await (sb as any)
    .from('content')
    .select(`
      slug,
      profiles!author_id ( display_name, slug, role, avatar_url )
    `)
    .eq('type', 'article')
    .eq('status', 'published')
    .in('profiles.role', ['admin', 'author'])
    .limit(3)
  if (error) console.error('error:', error)
  for (const row of data ?? []) {
    console.log(row.slug, '→ avatar_url:', row.profiles?.avatar_url ?? 'NULL')
  }
}
main()
