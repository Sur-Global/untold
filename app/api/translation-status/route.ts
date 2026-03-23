import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Poll for all translated content for a content item.
 * GET /api/translation-status?contentId=X&locale=Y&authorId=Z
 * Returns: { body, description, chapters, transcript, authorBio }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contentId = searchParams.get('contentId')
  const locale = searchParams.get('locale')
  const authorId = searchParams.get('authorId')

  if (!contentId || !locale) {
    return NextResponse.json({ error: 'contentId and locale required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const [{ data: translation }, { data: videoMeta }, { data: authorProfile }] = await Promise.all([
    (supabase as any)
      .from('content_translations')
      .select('body, description')
      .eq('content_id', contentId)
      .eq('locale', locale)
      .maybeSingle(),
    (supabase as any)
      .from('video_meta')
      .select('chapter_translations, transcript_translations')
      .eq('content_id', contentId)
      .maybeSingle(),
    authorId
      ? (supabase as any)
          .from('profiles')
          .select('profile_translations')
          .eq('id', authorId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const transcriptTrans = videoMeta?.transcript_translations as Record<string, unknown> | null
  const chapterTrans = videoMeta?.chapter_translations as Record<string, unknown> | null
  const profileTrans = authorProfile?.profile_translations as Record<string, { bio?: string }> | null

  return NextResponse.json({
    body: translation?.body ?? null,
    description: translation?.description ?? null,
    chapters: chapterTrans?.[locale] ?? null,
    transcript: transcriptTrans?.[locale] ?? null,
    authorBio: profileTrans?.[locale]?.bio ?? null,
  })
}
