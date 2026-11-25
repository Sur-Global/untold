import { createClient } from '@supabase/supabase-js'

const slug = process.argv[2] ?? 'amazofuturismo'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: content } = await (sb as any)
    .from('content')
    .select('id, slug, status, type')
    .eq('slug', slug)
    .single()

  if (!content) { console.log('Not found:', slug); return }
  console.log('content:', content)

  const { data: translations } = await (sb as any)
    .from('content_translations')
    .select('id, locale, title, excerpt, body')
    .eq('content_id', content.id)

  for (const t of translations ?? []) {
    const body = t.body
    const nodeCount = Array.isArray(body?.content) ? body.content.length : 'N/A'
    const firstNodes = Array.isArray(body?.content)
      ? body.content.slice(0, 3).map((n: any) => ({
          type: n.type,
          text: n.content?.[0]?.text?.slice(0, 80) ?? n.attrs?.src?.slice(0, 60) ?? '',
        }))
      : null
    console.log(`\n[${t.locale}] id=${t.id}`)
    console.log('  title:', t.title)
    console.log('  excerpt:', t.excerpt?.slice(0, 100))
    console.log('  body node count:', nodeCount)
    console.log('  first nodes:', JSON.stringify(firstNodes, null, 2))
  }

  const { data: tags } = await (sb as any)
    .from('content_tags')
    .select('tags(id, slug, names)')
    .eq('content_id', content.id)

  console.log('\ntags:', JSON.stringify(tags?.map((ct: any) => ct.tags), null, 2))
}

main().catch(console.error)
