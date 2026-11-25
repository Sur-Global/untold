import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const AUTHORS = [
  {
    slug: 'cristian-situ',
    filePath: '/Users/elsieralston/Downloads/Cristian Situ.png',
    storagePath: 'cristian-situ.png',
  },
  {
    slug: 'elsie-ralston',
    filePath: '/Users/elsieralston/Downloads/Elsie Ralston.png',
    storagePath: 'elsie-ralston.png',
  },
]

async function main() {
  for (const author of AUTHORS) {
    console.log(`\nProcessing ${author.slug}...`)

    // Read file
    const fileBuffer = fs.readFileSync(author.filePath)
    console.log(`  Read ${fileBuffer.byteLength} bytes from ${author.filePath}`)

    // Upload to storage (upsert)
    const { data: uploadData, error: uploadError } = await sb.storage
      .from('avatars')
      .upload(author.storagePath, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      console.error(`  ✗ Upload failed:`, uploadError.message)
      continue
    }
    console.log(`  ✓ Uploaded to avatars/${author.storagePath}`)

    // Get public URL
    const { data: { publicUrl } } = sb.storage
      .from('avatars')
      .getPublicUrl(author.storagePath)

    console.log(`  Public URL: ${publicUrl}`)

    // Update profile
    const { error: updateError } = await (sb as any)
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('slug', author.slug)

    if (updateError) {
      console.error(`  ✗ Profile update failed:`, updateError.message)
    } else {
      console.log(`  ✓ Profile updated successfully`)
    }
  }
  console.log('\nDone.')
}

main().catch(console.error)
