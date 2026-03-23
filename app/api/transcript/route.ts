import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { extractYouTubeId } from '@/lib/youtube'
import { extractYouTubeTranscript } from '@/lib/transcript'

/** Poll for a translated transcript: GET /api/transcript?contentId=X&locale=Y */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contentId = searchParams.get('contentId')
  const locale = searchParams.get('locale')

  if (!contentId || !locale) {
    return NextResponse.json({ error: 'contentId and locale required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data } = await (supabase as any)
    .from('video_meta')
    .select('transcript_translations')
    .eq('content_id', contentId)
    .maybeSingle()

  const transcript = (data?.transcript_translations as Record<string, unknown> | null)?.[locale] ?? null
  return NextResponse.json({ transcript })
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-transcript-secret')
  if (!secret || secret !== process.env.TRANSCRIPT_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { contentId } = body as { contentId?: string }
  if (!contentId) {
    return NextResponse.json({ error: 'contentId required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data: meta } = await (supabase as any)
    .from('video_meta')
    .select('embed_url')
    .eq('content_id', contentId)
    .maybeSingle()

  if (!meta?.embed_url) {
    // Not a video or no embed URL — skip silently
    return new NextResponse(null, { status: 204 })
  }

  const videoId = extractYouTubeId(meta.embed_url)
  if (!videoId) {
    // Vimeo or unknown platform — no transcript support
    return new NextResponse(null, { status: 204 })
  }

  const transcript = await extractYouTubeTranscript(videoId)
  if (!transcript) {
    return new NextResponse(null, { status: 204 })
  }

  await (supabase as any)
    .from('video_meta')
    .upsert({ content_id: contentId, transcript }, { onConflict: 'content_id' })

  return NextResponse.json({ ok: true, cues: transcript.length })
}
