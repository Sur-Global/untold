import { createClient } from '@supabase/supabase-js'

const CONTENT_ID = '43e90b46-be60-44d7-9180-6f422242177c'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Inspect the content_tags rows for this article
  const { data: rows, error } = await (sb as any)
    .from('content_tags')
    .select('*, tags(id, slug, names)')
    .eq('content_id', CONTENT_ID)

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log('content_tags rows:', JSON.stringify(rows, null, 2))

  // Find the habilidades tag
  const habilidades = (rows ?? []).find((r: any) =>
    r.tags?.slug?.includes('habilidades') ||
    Object.values(r.tags?.names ?? {}).some((v: any) =>
      String(v).toLowerCase().includes('habilidades')
    )
  )

  if (!habilidades) {
    console.log('\n⚠ "habilidades" tag not found among this article\'s tags')
    // List all tags so we can find the right one
    console.log('All tags:', (rows ?? []).map((r: any) => r.tags?.slug))
    return
  }

  console.log('\nFound row to delete:', habilidades)

  // Delete using the composite key (content_id + tag_id)
  const { error: delErr } = await (sb as any)
    .from('content_tags')
    .delete()
    .eq('content_id', CONTENT_ID)
    .eq('tag_id', habilidades.tag_id)

  if (delErr) console.error('Delete error:', delErr.message)
  else console.log('✓ Tag removed successfully')
}

main().catch(console.error)
