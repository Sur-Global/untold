'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { requireAdmin } from '@/lib/require-admin'
import { slugify } from '@/lib/utils'

export async function createCourse(formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const price = parseFloat((formData.get('price') as string) || '0') || 0
  const currency = (formData.get('currency') as string)?.trim() || 'USD'
  const duration = (formData.get('duration') as string)?.trim() || null

  const slug = `${slugify(title)}-${Date.now().toString(36)}`

  const { data: content, error } = await (supabase as any)
    .from('content')
    .insert({
      type: 'course',
      author_id: user.id,
      slug,
      source_locale: 'en',
      status: 'draft',
      cover_image_url: coverImageUrl,
    })
    .select('id')
    .single()

  if (error || !content) throw new Error(error?.message ?? 'Failed to create course')

  const { error: translationError } = await (supabase as any)
    .from('content_translations')
    .insert({
      content_id: content.id,
      locale: 'en',
      title,
      description,
      body: null,
    })

  if (translationError) throw new Error(translationError.message ?? 'Failed to save course translation')

  const { error: metaError } = await (supabase as any)
    .from('course_meta')
    .insert({
      content_id: content.id,
      price,
      currency,
      duration,
      students_count: 0,
    })

  if (metaError) throw new Error(metaError.message ?? 'Failed to save course metadata')

  revalidatePath('/dashboard')
  redirect(`/dashboard/courses/${content.id}/edit`)
}

export async function updateCourse(id: string, formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const description = (formData.get('description') as string)?.trim() || null
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const price = parseFloat((formData.get('price') as string) || '0') || 0
  const currency = (formData.get('currency') as string)?.trim() || 'USD'
  const duration = (formData.get('duration') as string)?.trim() || null

  const { data: owned } = await (supabase as any)
    .from('content')
    .update({ cover_image_url: coverImageUrl, updated_at: new Date().toISOString() })
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
    .from('course_meta')
    .upsert(
      { content_id: id, price, currency, duration },
      { onConflict: 'content_id' }
    )

  revalidatePath(`/dashboard/courses/${id}/edit`)
  revalidatePath('/dashboard')
}

export async function publishCourse(id: string) {
  await requireAdmin()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/courses')
  revalidatePath(`/dashboard/courses/${id}/edit`)

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

export async function unpublishCourse(id: string) {
  await requireAdmin()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null })
    .eq('id', id)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/courses')
  revalidatePath(`/dashboard/courses/${id}/edit`)
}
