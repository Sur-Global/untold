import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processAndStoreImage } from '@/lib/image-upload'
import { isActiveAdmin } from '@/lib/is-admin'
import { fetchImageFromUrl, ImageFetchError } from '@/lib/safe-fetch-image'

// Re-hosts a photo the creator pasted as a link: downloads it, resizes it and stores it with our
// own images, so it never breaks (hotlink blocks, deleted originals) and always has the right size.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  const type = body?.type
  if (!url || (type !== 'cover' && type !== 'avatar' && type !== 'content' && type !== 'banner' && type !== 'hero' && type !== 'person')) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (type === 'banner' && !(await isActiveAdmin(supabase, user.id))) {
    return NextResponse.json({ error: 'Only administrators can upload banners' }, { status: 403 })
  }

  try {
    const buffer = await fetchImageFromUrl(url)
    return NextResponse.json({ url: await processAndStoreImage(buffer, type, user.id) })
  } catch (err) {
    if (err instanceof ImageFetchError) return NextResponse.json({ error: err.message }, { status: 422 })
    return NextResponse.json({ error: 'Could not import that image' }, { status: 500 })
  }
}
