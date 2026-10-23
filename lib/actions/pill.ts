'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { notifyFeatureRequest, readFeatureRequest, syncFeatureRequest } from '@/lib/feature-request'
import { isEditorRole } from '@/lib/require-editor'
import { slugify } from '@/lib/utils'
import { resolveSourceLocale } from '@/lib/resolve-source-locale'
import { readLanguageAvailability } from '@/lib/language-availability'
import { readDeclaration, recordDeclaration } from '@/lib/declaration'
import { saveLanguageAvailability } from '@/lib/save-language-availability'
import { publishNewContent } from '@/lib/publish-new-content'
import { resolveAuthorId, requestedAuthorId } from '@/lib/resolve-author'
import { logActivity } from '@/lib/actions/activity-log'
import { stripNewMediaBlocks } from '@/lib/body-policy'
import { publishErrorMessage } from '@/lib/profile-complete'
import { firstSlideImage, parseSlides } from '@/lib/pill-slides'
import { assertShortText, readPillFormat } from '@/lib/pill-form'
import { normalizeAccent } from '@/lib/pill-accent'

async function syncTags(supabase: any, contentId: string, formData: FormData, replace: boolean) {
  const raw = formData.get('tag_ids') as string | null
  if (raw === null && replace) return // an old form that does not send tags: leave them as they are
  const ids: string[] = raw ? (() => { try { return JSON.parse(raw) } catch { return [] } })() : []
  if (replace) await supabase.from('content_tags').delete().eq('content_id', contentId)
  if (ids.length > 0) await supabase.from('content_tags').insert(ids.map((tag_id: string) => ({ content_id: contentId, tag_id })))
}

export async function createPill(formData: FormData) {
  const { user, profile } = await requireCreator()
  const supabase = await createClient()
  const sourceLocale = resolveSourceLocale(formData)
  const declared = readDeclaration(formData)
  if (formData.get('publish') === 'true' && !declared) {
    throw new Error('Please confirm the responsibility statement before publishing')
  }
  const authorId = await resolveAuthorId(supabase, formData, user, profile.role)

  const title = (formData.get('title') as string).trim()
  const body = formData.get('body') as string | null
  const accentColor = normalizeAccent(formData.get('accent_color'))
  const { format, slides, description } = await readPillFormat(formData, formData.get('publish') === 'true', { canBrand: isEditorRole(profile.role) })
  const bodyJson = format === 'text' && body ? stripNewMediaBlocks((() => { try { return JSON.parse(body) } catch { return null } })()) : null
  if (format === 'text') assertShortText(bodyJson)
  // the cover of a carousel is its first picture
  const imageUrl = (format === 'carousel' ? firstSlideImage(slides) : null) ?? ((formData.get('image_url') as string)?.trim() || null)
  const featureRequested = readFeatureRequest(formData) === true

  const slug = `${slugify(title)}-${Date.now().toString(36)}`

  const { data: content, error } = await (supabase as any)
    .from('content')
    .insert({
      type: 'pill',
      author_id: authorId,
      slug,
      source_locale: sourceLocale,
      ...(readLanguageAvailability(formData) ?? {}),
      declaration_accepted_at: declared ? new Date().toISOString() : null,
      status: 'draft',
      cover_image_url: imageUrl,
      feature_requested_at: featureRequested ? new Date().toISOString() : null,
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
      // Knowledge pills can't contain videos, audio or files, whatever the editor sent
      body: bodyJson,
      excerpt: description,
    })

  if (translationError) throw new Error(translationError.message ?? 'Failed to save pill translation')

  const { error: metaError } = await (supabase as any)
    .from('pill_meta')
    .insert({
      content_id: content.id,
      accent_color: accentColor,
      image_url: imageUrl,
      format,
      slides,
    })

  if (metaError) throw new Error(metaError.message ?? 'Failed to save pill metadata')

  await syncTags(supabase, content.id, formData, false)

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
  const accentColor = normalizeAccent(formData.get('accent_color'))
  const { data: currentMeta } = await (supabase as any).from('pill_meta').select('slides, slide_translations').eq('content_id', id).maybeSingle()
  const { format, slides, description } = await readPillFormat(formData, false, { canBrand: isEditorRole(profile.role), existing: currentMeta?.slides })
  const imageUrl = (format === 'carousel' ? firstSlideImage(slides) : null) ?? ((formData.get('image_url') as string)?.trim() || null)

  const newAuthorId = await requestedAuthorId(supabase, formData, profile.role)

  const updateQuery = (supabase as any)
    .from('content')
    .update({
      ...(newAuthorId ? { author_id: newAuthorId } : {}), cover_image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (!isEditorRole(profile.role)) updateQuery.eq('author_id', user.id)
  const { data: owned } = await updateQuery.select('id, source_locale').single()

  if (!owned) return
  await syncFeatureRequest(id, readFeatureRequest(formData))
  after(() => notifyFeatureRequest(id))
  const sourceLocale: string = owned.source_locale ?? 'en'
  await saveLanguageAvailability(supabase, id, sourceLocale, formData)
  await recordDeclaration(supabase, id, formData)

  const rawBodyJson = body ? (() => { try { return JSON.parse(body) } catch { return null } })() : null

  const { data: currentEn } = await (supabase as any)
    .from('content_translations')
    .select('title, body, excerpt')
    .eq('content_id', id)
    .eq('locale', sourceLocale)
    .single()

  // Media blocks already in the stored body are kept; new ones are dropped (pills allow none)
  const bodyJson = format === 'text' ? stripNewMediaBlocks(rawBodyJson, currentEn?.body) : null
  if (format === 'text') assertShortText(bodyJson)
  const titleChanged = currentEn?.title !== title
  const bodyChanged = JSON.stringify(currentEn?.body ?? null) !== JSON.stringify(bodyJson)

  await (supabase as any)
    .from('content_translations')
    .upsert(
      { content_id: id, locale: sourceLocale, title, body: bodyJson, excerpt: description },
      { onConflict: 'content_id,locale' }
    )

  const descriptionChanged = (currentEn?.excerpt ?? null) !== description
  if (titleChanged || bodyChanged || descriptionChanged) {
    const staleFields: Record<string, null> = {}
    if (titleChanged) staleFields.title = null
    if (bodyChanged) staleFields.body = null
    if (descriptionChanged) staleFields.excerpt = null
    await (supabase as any)
      .from('content_translations')
      .update(staleFields)
      .eq('content_id', id)
      .neq('locale', sourceLocale)
      // Versions someone edited by hand are theirs — only automatic translations are refreshed
      .or('is_auto_translated.is.null,is_auto_translated.eq.true')
  }

  // The translated texts of the slides are only valid for the texts they were made from
  const slideTexts = (list: unknown) => JSON.stringify(parseSlides(list).map((x) => [x.id, x.text]))
  const slidesTextChanged = slideTexts(currentMeta?.slides) !== slideTexts(slides)
  await (supabase as any)
    .from('pill_meta')
    .upsert(
      {
        content_id: id, accent_color: accentColor, image_url: imageUrl, format, slides,
        slide_translations: slidesTextChanged ? null : (currentMeta?.slide_translations ?? null),
      },
      { onConflict: 'content_id' }
    )

  await syncTags(supabase, id, formData, true)

  await logActivity({ entityType: 'pill', entityId: id, entityLabel: title, action: 'updated' })

  revalidatePath(`/dashboard/pills/${id}/edit`)
  revalidatePath('/dashboard')
}

export async function publishPill(id: string) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const { error: publishError } = await (supabase as any)
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)
  if (publishError) throw new Error(publishErrorMessage(publishError))

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/pills')
  revalidatePath(`/dashboard/pills/${id}/edit`)

  after(async () => {
    await notifyFeatureRequest(id)
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
