'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { slugify } from '@/lib/utils'
import { computeReadTime } from '@/lib/readTime'

export async function createArticle(formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const excerpt = (formData.get('excerpt') as string)?.trim() || null
  const featuredSummary = (formData.get('featured_summary') as string)?.trim() || null
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const imageCredits = (formData.get('image_credits') as string)?.trim() || null
  const body = formData.get('body') as string | null
  const tagIdsRaw = formData.get('tag_ids') as string | null
  const featureRequested = formData.get('feature_requested') === 'true'

  // Append a short timestamp suffix to ensure slug uniqueness
  const slug = `${slugify(title)}-${Date.now().toString(36)}`

  const { data: content, error } = await (supabase as any)
    .from('content')
    .insert({
      type: 'article',
      author_id: user.id,
      slug,
      source_locale: 'en',
      status: 'draft',
      cover_image_url: coverImageUrl,
      image_credits: imageCredits,
      feature_requested_at: featureRequested ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !content) throw new Error(error?.message ?? 'Failed to create article')

  const bodyJson = body ? (() => { try { return JSON.parse(body) } catch { return null } })() : null

  const { error: translationError } = await (supabase as any).from('content_translations').insert({
    content_id: content.id,
    locale: 'en',
    title,
    excerpt,
    featured_summary: featuredSummary,
    body: bodyJson,
  })

  if (translationError) throw new Error(translationError.message ?? 'Failed to save article content')

  const readTimeMinutes = bodyJson ? computeReadTime(bodyJson) : null
  if (readTimeMinutes !== null) {
    await (supabase as any)
      .from('content')
      .update({ read_time_minutes: readTimeMinutes })
      .eq('id', content.id)
      .eq('author_id', user.id)
  }

  // Sync tags
  const tagIds = tagIdsRaw ? JSON.parse(tagIdsRaw) as string[] : []
  if (tagIds.length > 0) {
    await (supabase as any)
      .from('content_tags')
      .insert(tagIds.map((tag_id: string) => ({ content_id: content.id, tag_id })))
  }

  revalidatePath('/dashboard/articles')
  redirect(`/dashboard/articles/${content.id}/edit`)
}

export async function updateArticle(id: string, formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const excerpt = (formData.get('excerpt') as string)?.trim() || null
  const featuredSummary = (formData.get('featured_summary') as string)?.trim() || null
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const imageCredits = (formData.get('image_credits') as string)?.trim() || null
  const body = formData.get('body') as string | null
  const tagIdsRaw = formData.get('tag_ids') as string | null
  const featureRequested = formData.get('feature_requested') === 'true'

  await (supabase as any)
    .from('content')
    .update({
      cover_image_url: coverImageUrl,
      image_credits: imageCredits,
      feature_requested_at: featureRequested ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('author_id', user.id)

  const bodyJson = body ? (() => { try { return JSON.parse(body) } catch { return null } })() : null

  // Detect changes before upserting so we can invalidate stale translations
  const { data: currentEn } = await (supabase as any)
    .from('content_translations')
    .select('title, excerpt, body')
    .eq('content_id', id)
    .eq('locale', 'en')
    .single()

  const titleChanged = currentEn?.title !== title
  const excerptChanged = currentEn?.excerpt !== excerpt
  const bodyChanged = JSON.stringify(currentEn?.body ?? null) !== JSON.stringify(bodyJson)

  await (supabase as any)
    .from('content_translations')
    .upsert({
      content_id: id,
      locale: 'en',
      title,
      excerpt,
      featured_summary: featuredSummary,
      body: bodyJson,
    }, { onConflict: 'content_id,locale' })

  // Null out stale non-English fields so they re-translate on next view
  if (titleChanged || excerptChanged || bodyChanged) {
    const staleFields: Record<string, null> = {}
    if (titleChanged) staleFields.title = null
    if (excerptChanged) staleFields.excerpt = null
    if (bodyChanged) staleFields.body = null
    await (supabase as any)
      .from('content_translations')
      .update(staleFields)
      .eq('content_id', id)
      .neq('locale', 'en')
  }

  const readTimeMinutes = bodyJson ? computeReadTime(bodyJson) : null
  if (readTimeMinutes !== null) {
    await (supabase as any)
      .from('content')
      .update({ read_time_minutes: readTimeMinutes })
      .eq('id', id)
      .eq('author_id', user.id)
  }

  // Sync tags
  const tagIds = tagIdsRaw ? JSON.parse(tagIdsRaw) as string[] : []
  await (supabase as any).from('content_tags').delete().eq('content_id', id)
  if (tagIds.length > 0) {
    await (supabase as any)
      .from('content_tags')
      .insert(tagIds.map((tag_id: string) => ({ content_id: id, tag_id })))
  }

  revalidatePath(`/dashboard/articles/${id}/edit`)
}

export async function publishArticle(id: string, _formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)

  revalidatePath('/dashboard/articles')
  revalidatePath(`/dashboard/articles/${id}/edit`)

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

export async function unpublishArticle(id: string, _formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null })
    .eq('id', id)
    .eq('author_id', user.id)

  revalidatePath('/dashboard/articles')
  revalidatePath(`/dashboard/articles/${id}/edit`)
}

export async function deleteArticle(id: string) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any).from('content').delete().eq('id', id).eq('author_id', user.id)

  revalidatePath('/dashboard/articles')
  redirect('/dashboard/articles')
}
