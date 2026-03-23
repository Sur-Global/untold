'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { slugify } from '@/lib/utils'
import { extractYouTubeId } from '@/lib/youtube'
import { extractYouTubeTranscript } from '@/lib/transcript'

export async function createVideo(formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const bodyRaw = formData.get('body') as string | null
  const body = bodyRaw ? JSON.parse(bodyRaw) : null
  const embedUrl = (formData.get('embed_url') as string).trim()
  const thumbnailUrl = (formData.get('thumbnail_url') as string)?.trim() || null
  const duration = (formData.get('duration') as string)?.trim() || null
  const tagIdsRaw = formData.get('tag_ids') as string | null
  const featureRequested = formData.get('feature_requested') === 'true'
  const chaptersRaw = formData.get('chapters') as string | null
  const layoutStyle = (formData.get('layout_style') as string)?.trim() || 'standard'
  const showTranscript = formData.get('show_transcript') === 'true'

  const slug = `${slugify(title)}-${Date.now().toString(36)}`

  const { data: content, error } = await (supabase as any)
    .from('content')
    .insert({
      type: 'video',
      author_id: user.id,
      slug,
      source_locale: 'en',
      status: 'draft',
      cover_image_url: thumbnailUrl,
      feature_requested_at: featureRequested ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !content) throw new Error(error?.message ?? 'Failed to create video')

  const { error: translationError } = await (supabase as any)
    .from('content_translations')
    .insert({
      content_id: content.id,
      locale: 'en',
      title,
      body,
    })

  if (translationError) throw new Error(translationError.message ?? 'Failed to save video translation')

  const chapters = chaptersRaw ? JSON.parse(chaptersRaw) : []

  const { error: metaError } = await (supabase as any)
    .from('video_meta')
    .insert({
      content_id: content.id,
      embed_url: embedUrl,
      thumbnail_url: thumbnailUrl,
      duration,
      chapters,
      layout_style: layoutStyle,
      show_transcript: showTranscript,
    })

  if (metaError) throw new Error(metaError.message ?? 'Failed to save video metadata')

  // Sync tags
  const tagIds = tagIdsRaw ? (JSON.parse(tagIdsRaw) as string[]) : []
  if (tagIds.length > 0) {
    await (supabase as any)
      .from('content_tags')
      .insert(tagIds.map((tag_id: string) => ({ content_id: content.id, tag_id })))
  }

  revalidatePath('/dashboard')
  redirect(`/dashboard/videos/${content.id}/edit`)
}

export async function updateVideo(id: string, formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const bodyRaw = formData.get('body') as string | null
  const body = bodyRaw ? JSON.parse(bodyRaw) : null
  const embedUrl = (formData.get('embed_url') as string).trim()
  const thumbnailUrl = (formData.get('thumbnail_url') as string)?.trim() || null
  const duration = (formData.get('duration') as string)?.trim() || null
  const tagIdsRaw = formData.get('tag_ids') as string | null
  const featureRequested = formData.get('feature_requested') === 'true'
  const chaptersRaw = formData.get('chapters') as string | null
  const layoutStyle = (formData.get('layout_style') as string)?.trim() || 'standard'
  const showTranscript = formData.get('show_transcript') === 'true'

  const { data: owned } = await (supabase as any)
    .from('content')
    .update({
      cover_image_url: thumbnailUrl,
      updated_at: new Date().toISOString(),
      feature_requested_at: featureRequested ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('author_id', user.id)
    .select('id')
    .single()

  if (!owned) return

  await (supabase as any)
    .from('content_translations')
    .upsert(
      { content_id: id, locale: 'en', title, body },
      { onConflict: 'content_id,locale' }
    )

  const chapters = chaptersRaw ? JSON.parse(chaptersRaw) : []

  await (supabase as any)
    .from('video_meta')
    .upsert(
      {
        content_id: id,
        embed_url: embedUrl,
        thumbnail_url: thumbnailUrl,
        duration,
        chapters,
        layout_style: layoutStyle,
        show_transcript: showTranscript,
      },
      { onConflict: 'content_id' }
    )

  // Sync tags
  const tagIds = tagIdsRaw ? (JSON.parse(tagIdsRaw) as string[]) : []
  await (supabase as any).from('content_tags').delete().eq('content_id', id)
  if (tagIds.length > 0) {
    await (supabase as any)
      .from('content_tags')
      .insert(tagIds.map((tag_id: string) => ({ content_id: id, tag_id })))
  }

  revalidatePath(`/dashboard/videos/${id}/edit`)
  revalidatePath('/dashboard')
}

export async function extractTranscript(id: string) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  // Verify ownership
  const { data: owned } = await (supabase as any)
    .from('content')
    .select('id')
    .eq('id', id)
    .eq('author_id', user.id)
    .single()

  if (!owned) return

  // Get embed URL
  const { data: meta } = await (supabase as any)
    .from('video_meta')
    .select('embed_url')
    .eq('content_id', id)
    .single()

  if (!meta?.embed_url) return

  const videoId = extractYouTubeId(meta.embed_url)
  if (!videoId) return

  const transcript = await extractYouTubeTranscript(videoId)
  if (!transcript) return

  await (supabase as any)
    .from('video_meta')
    .update({ transcript })
    .eq('content_id', id)

  revalidatePath('/dashboard', 'layout')
  // Best-effort revalidation of public video pages — may not wildcard all locales
  revalidatePath('/[locale]/videos/[slug]', 'page')
}
