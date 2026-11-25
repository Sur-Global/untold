import { createClient } from '@supabase/supabase-js'

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await (sb as any).from('profiles').select('id, slug, display_name, avatar_url').in('slug', ['cristian-situ', 'elsie-ralston'])
  console.log(JSON.stringify(data, null, 2))

  // Also check what storage buckets exist
  const { data: buckets } = await sb.storage.listBuckets()
  console.log('\nBuckets:', JSON.stringify(buckets?.map(b => b.name), null, 2))
}

main().catch(console.error)
