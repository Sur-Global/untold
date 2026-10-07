'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { isEditorRole } from '@/lib/require-editor'
import { slugify } from '@/lib/utils'
import { resolveSourceLocale } from '@/lib/resolve-source-locale'
import { readLanguageAvailability } from '@/lib/language-availability'
import { saveLanguageAvailability } from '@/lib/save-language-availability'
import { publishNewContent } from '@/lib/publish-new-content'
import { resolveAuthorId, requestedAuthorId } from '@/lib/resolve-author'
import { logActivity } from '@/lib/actions/activity-log'

export async function createPodcast(formData: FormData) {
  const { user, profile } = await requireCreator()
  const supabase = await createClient()
  const sourceLocale = resolveSourceLocale(formData)
  const authorId = await resolveAuthorId(supabase, formData, user, profile.role)

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const embedUrl = (formData.get('embed_url') as string).trim()
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const duration = (formData.get('duration') as string)?.trim() || null
  const episodeNumber = (formData.get('episode_number') as string)?.trim() || null

  const slug = `${slugify(title)}-${Date.now().toString(36)}`

  const { data: content, error } = await (supabase as any)
    .from('content')
    .insert({
      type: 'podcast',
      author_id: authorId,
      slug,
      source_locale: sourceLocale,
      ...(readLanguageAvailability(formData) ?? {}),
      status: 'draft',
      cover_image_url: coverImageUrl,
    })
    .select('id')
    .single()

  if (error || !content) throw new Error(error?.message ?? 'Failed to create podcast')

  const { error: translationError } = await (supabase as any)
    .from('content_translations')
    .insert({
      content_id: content.id,
      locale: sourceLocale,
      title,
      description,
      body: null,
    })

  if (translationError) throw new Error(translationError.message ?? 'Failed to save podcast translation')

  const { error: metaError } = await (supabase as any)
    .from('podcast_meta')
    .insert({
      content_id: content.id,
      embed_url: embedUrl,
      cover_image_url: coverImageUrl,
      duration,
      episode_number: episodeNumber,
    })

  if (metaError) throw new Error(metaError.message ?? 'Failed to save podcast metadata')

  await logActivity({ entityType: 'podcast', entityId: content.id, entityLabel: title, action: authorId === user.id ? 'created' : 'created_on_behalf' })

  // "Publish" button on the create form: publish right away instead of saving a draft
  if (formData.get('publish') === 'true') {
    await publishNewContent(supabase, content.id, 'podcast')
    await logActivity({ entityType: 'podcast', entityId: content.id, entityLabel: title, action: 'published' })
  }

  revalidatePath('/dashboard')
  redirect(`/dashboard/podcasts/${content.id}/edit`)
}

export async function updatePodcast(id: string, formData: FormData) {
  const { user, profile } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const embedUrl = (formData.get('embed_url') as string).trim()
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const duration = (formData.get('duration') as string)?.trim() || null
  const episodeNumber = (formData.get('episode_number') as string)?.trim() || null

  const newAuthorId = await requestedAuthorId(supabase, formData, profile.role)

  const updateQuery = (supabase as any)
    .from('content')
    .update({
      ...(newAuthorId ? { author_id: newAuthorId } : {}), cover_image_url: coverImageUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (!isEditorRole(profile.role)) updateQuery.eq('author_id', user.id)
  const { data: owned } = await updateQuery.select('id, source_locale').single()

  if (!owned) return
  const sourceLocale: string = owned.source_locale ?? 'en'
  await saveLanguageAvailability(supabase, id, sourceLocale, formData)

  await (supabase as any)
    .from('content_translations')
    .upsert(
      { content_id: id, locale: sourceLocale, title, description, body: null },
      { onConflict: 'content_id,locale' }
    )

  await (supabase as any)
    .from('podcast_meta')
    .upsert(
      { content_id: id, embed_url: embedUrl, cover_image_url: coverImageUrl, duration, episode_number: episodeNumber },
      { onConflict: 'content_id' }
    )

  await logActivity({ entityType: 'podcast', entityId: id, entityLabel: title, action: 'updated' })

  revalidatePath(`/dashboard/podcasts/${id}/edit`)
  revalidatePath('/dashboard')
}

export async function publishPodcast(id: string) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/podcasts')
  revalidatePath(`/dashboard/podcasts/${id}/edit`)

  after(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
        },
        body: JSON.stringify({ contentId: id }),
      })
      if (!res.ok) {
        console.error(`Translation trigger failed for ${id}: ${res.status}`)
      }
    } catch (err) {
      console.error(`Translation trigger error for ${id}:`, err)
    }
  })
}

export async function unpublishPodcast(id: string) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null })
    .eq('id', id)
    .eq('author_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/podcasts')
  revalidatePath(`/dashboard/podcasts/${id}/edit`)
}
