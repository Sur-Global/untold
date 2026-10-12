import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isEditorRole } from '@/lib/require-editor'

const MAX_BYTES = 500 * 1024 * 1024
const EXT_BY_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

// Step 1 of a video upload: only editors and admins get a signed upload URL. The browser then
// sends the file straight to storage (videos are far too big for a serverless request body).
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, suspended_at')
    .eq('id', user.id)
    .single()
  if (!isEditorRole(profile?.role) || profile?.suspended_at) {
    return NextResponse.json({ error: 'Only editors and admins can upload videos' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const contentType = typeof body?.contentType === 'string' ? body.contentType : ''
  const size = Number(body?.size)
  const ext = EXT_BY_TYPE[contentType]
  if (!ext) return NextResponse.json({ error: 'Unsupported video type — use MP4, WebM or MOV' }, { status: 400 })
  if (!Number.isFinite(size) || size <= 0) return NextResponse.json({ error: 'Invalid file size' }, { status: 400 })
  if (size > MAX_BYTES) return NextResponse.json({ error: 'Video too large — max 500 MB' }, { status: 413 })

  const path = `videos/${user.id}/${crypto.randomUUID()}.${ext}`
  const storage = createServiceRoleClient()
  const { data, error } = await storage.storage.from('content-videos').createSignedUploadUrl(path)
  if (error || !data) return NextResponse.json({ error: 'Could not start the upload' }, { status: 500 })

  const { data: { publicUrl } } = storage.storage.from('content-videos').getPublicUrl(path)
  return NextResponse.json({ path, token: data.token, publicUrl })
}
