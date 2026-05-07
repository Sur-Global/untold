/**
 * Fix broken cover image URLs.
 * Run with: npx tsx --env-file=.env.local scripts/fix-cover-images.ts
 */
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const fixes = [
  // Bolivia / Andean highlands
  { slug: 'plurinational-state-an-experiment-in-progress', cover_image_url: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=900&h=500&fit=crop&q=80' },
]

async function main() {
  for (const fix of fixes) {
    const { error } = await (sb as any).from('content').update({ cover_image_url: fix.cover_image_url }).eq('slug', fix.slug)
    if (error) console.error(`✗ ${fix.slug}:`, error.message)
    else console.log(`✓ Fixed: ${fix.slug}`)
  }
}
main().catch(err => { console.error(err); process.exit(1) })
