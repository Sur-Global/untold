'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { slugify } from '@/lib/utils'

export async function createVideo(formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const embedUrl = (formData.get('embed_url') as string).trim()
  const thumbnailUrl = (formData.get('thumbnail_url') as string)?.trim() || null
  const duration = (formData.get('duration') as string)?.trim() || null

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
      description,
      body: null,
    })

  if (translationError) throw new Error(translationError.message ?? 'Failed to save video translation')

  const { error: metaError } = await (supabase as any)
    .from('video_meta')
    .insert({
      content_id: content.id,
      embed_url: embedUrl,
      thumbnail_url: thumbnailUrl,
      duration,
    })

  if (metaError) throw new Error(metaError.message ?? 'Failed to save video metadata')

  revalidatePath('/dashboard')
  redirect(`/dashboard/videos/${content.id}/edit`)
}

export async function updateVideo(id: string, formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const embedUrl = (formData.get('embed_url') as string).trim()
  const thumbnailUrl = (formData.get('thumbnail_url') as string)?.trim() || null
  const duration = (formData.get('duration') as string)?.trim() || null

  const { data: owned } = await (supabase as any)
    .from('content')
    .update({ cover_image_url: thumbnailUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)
    .select('id')
    .single()

  if (!owned) return

  await (supabase as any)
    .from('content_translations')
    .upsert(
      { content_id: id, locale: 'en', title, description, body: null },
      { onConflict: 'content_id,locale' }
    )

  await (supabase as any)
    .from('video_meta')
    .upsert(
      { content_id: id, embed_url: embedUrl, thumbnail_url: thumbnailUrl, duration },
      { onConflict: 'content_id' }
    )

  revalidatePath(`/dashboard/videos/${id}/edit`)
  revalidatePath('/dashboard')
}

export async function publishVideo(id: string) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/videos')
  revalidatePath(`/dashboard/videos/${id}/edit`)

  after(async () => {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
      },
      body: JSON.stringify({ contentId: id }),
    })
  })
}

export async function unpublishVideo(id: string) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null })
    .eq('id', id)
    .eq('author_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/videos')
  revalidatePath(`/dashboard/videos/${id}/edit`)
}
