'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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
