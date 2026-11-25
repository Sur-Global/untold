import { createClient } from '@supabase/supabase-js'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const translationId = '9baf5b32-4c44-48e8-8cd4-b0f0ace9d8c8'

  const { data: trans } = await (sb as any)
    .from('content_translations')
    .select('id, body')
    .eq('id', translationId)
    .single()

  if (!trans) { console.log('Translation not found'); return }

  const body = trans.body as any
  const node = body.content[6]

  if (node?.type !== 'image') {
    console.error('Node at index 6 is not an image:', node?.type)
    return
  }

  // Remove old plain credit, set rich creditHtml with the Wonderlane hyperlink
  node.attrs = {
    ...node.attrs,
    credit: null,
    creditHtml: 'Foto cortesía de <a href="https://unsplash.com/@wonderlane?ref=untold.ink" target="_blank" rel="noopener noreferrer">Wonderlane</a>',
  }

  console.log(`✓ Set creditHtml on image [6]`)
  console.log(`  src: ${node.attrs.src}`)

  const { error } = await (sb as any)
    .from('content_translations')
    .update({ body })
    .eq('id', trans.id)

  if (error) {
    console.error('Update failed:', error.message)
  } else {
    console.log('✓ content_translations updated successfully')
  }
}

main().catch(console.error)
