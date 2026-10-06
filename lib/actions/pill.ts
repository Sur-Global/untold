'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { isEditorRole } from '@/lib/require-editor'
import { slugify } from '@/lib/utils'
import { resolveSourceLocale } from '@/lib/resolve-source-locale'
import { publishNewContent } from '@/lib/publish-new-content'
import { resolveAuthorId, requestedAuthorId } from '@/lib/resolve-author'
import { logActivity } from '@/lib/actions/activity-log'

export async function createPill(formData: FormData) {
  const { user, profile } = await requireCreator()
  const supabase = await createClient()
  const sourceLocale = resolveSourceLocale(formData)
  const authorId = await resolveAuthorId(supabase, formData, user, profile.role)

  const title = (formData.get('title') as string).trim()
  const body = formData.get('body') as string | null
  const accentColor = (formData.get('accent_color') as string)?.trim() || '#C45D3A'
  const imageUrl = (formData.get('image_url') as string)?.trim() || null

  const slug = `${slugify(title)}-${Date.now().toString(36)}`

  const { data: content, error } = await (supabase as any)
    .from('content')
    .insert({
      type: 'pill',
      author_id: authorId,
      slug,
      source_locale: sourceLocale,
      status: 'draft',
      cover_image_url: imageUrl,
    })
    .select('id')
    .single()

  if (error || !content) throw new Error(error?.message ?? 'Failed to create pill')

  const { error: translationError } = await (supabase as any)
    .from('content_translations')
    .insert({
      content_id: content.id,
      locale: sourceLocale,
      title,
      body: body ? (() => { try { return JSON.parse(body) } catch { return null } })() : null,
    })

  if (translationError) throw new Error(translationError.message ?? 'Failed to save pill translation')

  const { error: metaError } = await (supabase as any)
    .from('pill_meta')
    .insert({
      content_id: content.id,
      accent_color: accentColor,
      image_url: imageUrl,
    })

  if (metaError) throw new Error(metaError.message ?? 'Failed to save pill metadata')

  await logActivity({ entityType: 'pill', entityId: content.id, entityLabel: title, action: authorId === user.id ? 'created' : 'created_on_behalf' })

  // "Publish" button on the create form: publish right away instead of saving a draft
  if (formData.get('publish') === 'true') {
    await publishNewContent(supabase, content.id, 'pill')
    await logActivity({ entityType: 'pill', entityId: content.id, entityLabel: title, action: 'published' })
  }

  revalidatePath('/dashboard')
  redirect(`/dashboard/pills/${content.id}/edit`)
}

export async function updatePill(id: string, formData: FormData) {
  const { user, profile } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const body = formData.get('body') as string | null
  const accentColor = (formData.get('accent_color') as string)?.trim() || '#C45D3A'
  const imageUrl = (formData.get('image_url') as string)?.trim() || null

  const newAuthorId = await requestedAuthorId(supabase, formData, profile.role)

  const updateQuery = (supabase as any)
    .from('content')
    .update({
      ...(newAuthorId ? { author_id: newAuthorId } : {}), cover_image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (!isEditorRole(profile.role)) updateQuery.eq('author_id', user.id)
  const { data: owned } = await updateQuery.select('id, source_locale').single()

  if (!owned) return
  const sourceLocale: string = owned.source_locale ?? 'en'

  const bodyJson = body ? (() => { try { return JSON.parse(body) } catch { return null } })() : null

  const { data: currentEn } = await (supabase as any)
    .from('content_translations')
    .select('title, body')
    .eq('content_id', id)
    .eq('locale', sourceLocale)
    .single()

  const titleChanged = currentEn?.title !== title
  const bodyChanged = JSON.stringify(currentEn?.body ?? null) !== JSON.stringify(bodyJson)

  await (supabase as any)
    .from('content_translations')
    .upsert(
      { content_id: id, locale: sourceLocale, title, body: bodyJson },
      { onConflict: 'content_id,locale' }
    )

  if (titleChanged || bodyChanged) {
    const staleFields: Record<string, null> = {}
    if (titleChanged) staleFields.title = null
    if (bodyChanged) staleFields.body = null
    await (supabase as any)
      .from('content_translations')
      .update(staleFields)
      .eq('content_id', id)
      .neq('locale', sourceLocale)
      // Versions someone edited by hand are theirs — only automatic translations are refreshed
      .or('is_auto_translated.is.null,is_auto_translated.eq.true')
  }

  await (supabase as any)
    .from('pill_meta')
    .upsert(
      { content_id: id, accent_color: accentColor, image_url: imageUrl },
      { onConflict: 'content_id' }
    )

  await logActivity({ entityType: 'pill', entityId: id, entityLabel: title, action: 'updated' })

  revalidatePath(`/dashboard/pills/${id}/edit`)
  revalidatePath('/dashboard')
}

export async function publishPill(id: string) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/pills')
  revalidatePath(`/dashboard/pills/${id}/edit`)

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

export async function unpublishPill(id: string) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null })
    .eq('id', id)
    .eq('author_id', user.id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/pills')
  revalidatePath(`/dashboard/pills/${id}/edit`)
}
