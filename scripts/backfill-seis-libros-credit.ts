/**
 * Backfills the cover image credit for the one article that actually has real
 * caption data in Ghost (an Unsplash attribution link, dropped on import because
 * feature_image_caption was never mapped — see import-ghost.ts).
 *
 * Dry-run by default — prints what would change. Pass --confirm to actually write.
 *   npx tsx --env-file=.env.local scripts/backfill-seis-libros-credit.ts [--confirm]
 */
import { createClient } from '@supabase/supabase-js'

const SLUG = 'seis-libros-para-reinventar-el-mundo-incomodos-inspiradores-y-necesarios'
const NEW_CREDIT = '[Unsplash](https://unsplash.com/?utm_source=ghost&utm_medium=referral&utm_campaign=api-credit)'

async function main() {
  const confirm = process.argv.includes('--confirm')
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: row, error } = await (sb as any)
    .from('content')
    .select('id, slug, image_credits')
    .eq('slug', SLUG)
    .single()

  if (error || !row) {
    console.error(`Could not find content row for slug "${SLUG}":`, error?.message)
    process.exit(1)
  }

  console.log(`Article: ${row.slug} (${row.id})`)
  console.log(`  current image_credits: ${JSON.stringify(row.image_credits)}`)
  console.log(`  new image_credits:     ${JSON.stringify(NEW_CREDIT)}`)

  if (!confirm) {
    console.log('\nDry run only — pass --confirm to write this change.')
    return
  }

  const { error: updateErr } = await (sb as any)
    .from('content')
    .update({ image_credits: NEW_CREDIT })
    .eq('id', row.id)

  if (updateErr) {
    console.error('Update failed:', updateErr.message)
    process.exit(1)
  }
  console.log('\n✓ Updated.')
}

main().catch(console.error)
