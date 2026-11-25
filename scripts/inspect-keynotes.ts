import { createClient } from '@supabase/supabase-js'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const slug = 'tu-trabajo-no-necesita-mas-keynotes'

  const { data: content } = await (sb as any)
    .from('content')
    .select('id, slug, author_id')
    .eq('slug', slug)
    .single()

  if (!content) { console.log('Article not found'); return }
  console.log('content_id:', content.id)
  console.log('author_id:', content.author_id)

  // Get ES translation (excerpt + body preview)
  const { data: trans } = await (sb as any)
    .from('content_translations')
    .select('id, locale, title, excerpt, description, body')
    .eq('content_id', content.id)
    .eq('locale', 'es')
    .single()

  console.log('\ntranslation_id:', trans?.id)
  console.log('excerpt:', trans?.excerpt)
  console.log('description:', trans?.description)

  // Body nodes
  const body = trans?.body as any
  if (Array.isArray(body?.content)) {
    body.content.forEach((node: any, i: number) => {
      if (node.type === 'image') {
        console.log(`\n[${i}] IMAGE: src=${node.attrs?.src}`)
      } else {
        const text = node.content?.map((c: any) => c.text ?? '').join('').slice(0, 100) ?? ''
        console.log(`[${i}] ${node.type}: ${text}`)
      }
    })
  }

  // Author profile
  const { data: author } = await (sb as any)
    .from('profiles')
    .select('id, slug, display_name, bio, profile_translations, avatar_url')
    .eq('id', content.author_id)
    .single()

  console.log('\nAuthor:', JSON.stringify(author, null, 2))
}

main().catch(console.error)
