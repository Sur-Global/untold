import { after } from 'next/server'

/**
 * Publishes a just-created content item (the "Publish" button on create forms),
 * mirroring what publishArticle/publishContent do from the edit screens:
 * flip status, then kick off translation (and transcript extraction for videos)
 * in the background.
 */
export async function publishNewContent(
  supabase: any,
  contentId: string,
  type: 'article' | 'video' | 'podcast' | 'pill' | 'course',
): Promise<void> {
  const { error } = await supabase
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', contentId)
  if (error) throw new Error(error.message ?? 'Saved, but could not publish')

  after(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
        },
        body: JSON.stringify({ contentId }),
      })
      if (!res.ok) console.error(`Translation trigger failed for ${contentId}: ${res.status}`)
    } catch (err) {
      console.error(`Translation trigger error for ${contentId}:`, err)
    }

    if (type === 'video') {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/transcript`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-transcript-secret': process.env.TRANSCRIPT_API_SECRET!,
          },
          body: JSON.stringify({ contentId }),
        })
        if (!res.ok) console.error(`Transcript trigger failed for ${contentId}: ${res.status}`)
      } catch (err) {
        console.error(`Transcript trigger error for ${contentId}:`, err)
      }
    }
  })
}
