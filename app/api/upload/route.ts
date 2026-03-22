import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null

  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Invalid file — must be an image' }, { status: 400 })
  }
  if (type !== 'cover' && type !== 'avatar') {
    return NextResponse.json({ error: 'Invalid type — must be cover or avatar' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large — max 5 MB' }, { status: 413 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    let processed: Buffer
    let storagePath: string
    let bucket: string

    if (type === 'cover') {
      processed = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      storagePath = `covers/${user.id}/${crypto.randomUUID()}.webp`
      bucket = 'content-images'
    } else {
      processed = await sharp(buffer)
        .resize(256, 256, { fit: 'cover', position: 'centre' })
        .webp({ quality: 80 })
        .toBuffer()
      storagePath = `${user.id}.webp`
      bucket = 'avatars'
    }

    const storage = createServiceRoleClient()
    const { error: uploadError } = await storage.storage
      .from(bucket)
      .upload(storagePath, processed, { contentType: 'image/webp', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
    }

    const { data: { publicUrl } } = storage.storage.from(bucket).getPublicUrl(storagePath)
    return NextResponse.json({ url: publicUrl })
  } catch {
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 })
  }
}
