'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'

export async function publishContent(id: string, _formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id)

  // 'layout' invalidates /dashboard and all nested pages (edit pages included)
  revalidatePath('/dashboard', 'layout')

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

    // transcript extraction
    try {
      const transcriptRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/transcript`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-transcript-secret': process.env.TRANSCRIPT_API_SECRET!,
        },
        body: JSON.stringify({ contentId: id }),
      })
      if (!transcriptRes.ok) {
        console.error(`Transcript trigger failed for ${id}: ${transcriptRes.status}`)
      }
    } catch (err) {
      console.error(`Transcript trigger error for ${id}:`, err)
    }
  })
}

export async function unpublishContent(id: string, _formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null })
    .eq('id', id)
    .eq('author_id', user.id)

  revalidatePath('/dashboard', 'layout')
}

export async function deleteContent(id: string) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .delete()
    .eq('id', id)
    .eq('author_id', user.id)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
