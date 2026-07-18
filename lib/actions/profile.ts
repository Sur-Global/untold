'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isEditorRole } from '@/lib/require-editor'
import { sanitizeBioHtml } from '@/lib/sanitize-bio-html'

export async function updateProfile(userId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Must be own profile or admin/editor
  if (user.id !== userId) {
    const { data: me } = await (supabase as any)
      .from('profiles').select('role').eq('id', user.id).single()
    if (!isEditorRole(me?.role)) throw new Error('Unauthorized')
  }

  const display_name = (formData.get('display_name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim().toLowerCase()
  // Defense-in-depth: the bio editor's own schema can only ever produce a
  // narrow set of tags, but sanitize again here in case this action is ever
  // called directly, bypassing the client editor.
  const bioRaw = (formData.get('bio') as string)?.trim() || null
  const bio = bioRaw ? sanitizeBioHtml(bioRaw) : null
  const location = (formData.get('location') as string)?.trim() || null
  const website = (formData.get('website') as string)?.trim() || null
  const avatar_url = (formData.get('avatar_url') as string)?.trim() || null

  if (!display_name) throw new Error('Display name is required')
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error('Slug must be lowercase letters, numbers and hyphens only')

  const { error } = await (supabase as any)
    .from('profiles')
    .update({ display_name, slug, bio, location, website, avatar_url })
    .eq('id', userId)

  if (error?.code === '23505') throw new Error('That URL slug is already taken')
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/profile')
  revalidatePath(`/author/${slug}`)
  revalidatePath('/admin/users')
}
