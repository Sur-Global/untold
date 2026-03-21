'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { slugify } from '@/lib/utils'

export async function createArticle(formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const excerpt = (formData.get('excerpt') as string)?.trim() || null
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const body = formData.get('body') as string | null

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
    })
    .select('id')
    .single()

  if (error || !content) throw new Error(error?.message ?? 'Failed to create article')

  const { error: translationError } = await (supabase as any).from('content_translations').insert({
    content_id: content.id,
    locale: 'en',
    title,
    excerpt,
    body: body ? JSON.parse(body) : null,
  })

  if (translationError) throw new Error(translationError.message ?? 'Failed to save article content')

  revalidatePath('/dashboard/articles')
  redirect(`/dashboard/articles/${content.id}/edit`)
}

export async function updateArticle(id: string, formData: FormData) {
  await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const excerpt = (formData.get('excerpt') as string)?.trim() || null
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const body = formData.get('body') as string | null

  await (supabase as any)
    .from('content')
    .update({ cover_image_url: coverImageUrl, updated_at: new Date().toISOString() })
    .eq('id', id)

  await (supabase as any)
    .from('content_translations')
    .upsert({
      content_id: id,
      locale: 'en',
      title,
      excerpt,
      body: body ? JSON.parse(body) : null,
    }, { onConflict: 'content_id,locale' })

  revalidatePath(`/dashboard/articles/${id}/edit`)
}

export async function publishArticle(id: string) {
  await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/dashboard/articles')
  revalidatePath(`/dashboard/articles/${id}/edit`)
}

export async function unpublishArticle(id: string) {
  await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null })
    .eq('id', id)

  revalidatePath('/dashboard/articles')
  revalidatePath(`/dashboard/articles/${id}/edit`)
}

export async function deleteArticle(id: string) {
  await requireCreator()
  const supabase = await createClient()

  await (supabase as any).from('content').delete().eq('id', id)

  revalidatePath('/dashboard/articles')
  redirect('/dashboard/articles')
}
