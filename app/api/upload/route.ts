import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processAndStoreImage } from '@/lib/image-upload'
import { isActiveAdmin, isActiveEditor } from '@/lib/is-admin'

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
  if (type !== 'cover' && type !== 'avatar' && type !== 'content' && type !== 'banner') {
    return NextResponse.json({ error: 'Invalid type — must be cover, avatar, content, or banner' }, { status: 400 })
  }
  // Advertising banners are an administrator's tool
  if (type === 'banner' && !(await isActiveAdmin(supabase, user.id))) {
    return NextResponse.json({ error: 'Only administrators can upload banners' }, { status: 403 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large — max 5 MB' }, { status: 413 })
  }

  // A profile photo is stored under the id of the person it belongs to. Editors and admins may upload one for
  // somebody else (Admin → Users); anyone else only for themselves.
  const requestedOwner = formData.get('ownerId')
  let ownerId = user.id
  if (type === 'avatar' && typeof requestedOwner === 'string' && requestedOwner && requestedOwner !== user.id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedOwner) || !(await isActiveEditor(supabase, user.id))) {
      return NextResponse.json({ error: 'You can only upload your own photo' }, { status: 403 })
    }
    ownerId = requestedOwner
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    return NextResponse.json({ url: await processAndStoreImage(buffer, type, ownerId) })
  } catch (err) {
    if (err instanceof Error && err.message === 'Storage upload failed') {
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 })
  }
}
