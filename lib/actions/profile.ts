'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isEditorRole } from '@/lib/require-editor'
import { sanitizeBioHtml } from '@/lib/sanitize-bio-html'
import { logActivity } from '@/lib/actions/activity-log'
import { urlOrNull, emailOrNull, linkOrMailtoOrNull } from '@/lib/profile-fields'

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
  const website = urlOrNull(formData.get('website') as string | null, 'Website')
  const avatar_url = (formData.get('avatar_url') as string)?.trim() || null

  const email = emailOrNull(formData.get('email') as string | null)

  const social_bluesky = urlOrNull(formData.get('social_bluesky') as string | null, 'BlueSky link')
  const social_linkedin = urlOrNull(formData.get('social_linkedin') as string | null, 'LinkedIn link')
  const social_instagram = urlOrNull(formData.get('social_instagram') as string | null, 'Instagram link')
  const social_medium = urlOrNull(formData.get('social_medium') as string | null, 'Medium link')
  const social_custom_url = urlOrNull(formData.get('social_custom_url') as string | null, 'Custom link')

  const bio_cta_label = (formData.get('bio_cta_label') as string)?.trim() || null
  const bio_cta_url = linkOrMailtoOrNull(formData.get('bio_cta_url') as string | null, 'Button link')

  if (!display_name) throw new Error('Display name is required')
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error('Slug must be lowercase letters, numbers and hyphens only')

  // Translated copies of the bio / button text are only valid for the text they were made
  // from — drop them when the original changes so they get re-translated.
  const { data: current } = await (supabase as any)
    .from('profiles')
    .select('bio, bio_cta_label, profile_translations')
    .eq('id', userId)
    .single()
  let profile_translations = current?.profile_translations as Record<string, any> | null
  if (profile_translations) {
    const dropKeys: string[] = []
    if ((current?.bio ?? null) !== bio) dropKeys.push('bio')
    if ((current?.bio_cta_label ?? null) !== bio_cta_label) dropKeys.push('cta_label')
    if (dropKeys.length) {
      profile_translations = Object.fromEntries(
        Object.entries(profile_translations).map(([key, value]) => {
          if (key.startsWith('_') || !value || typeof value !== 'object') return [key, value]
          const copy = { ...(value as Record<string, unknown>) }
          for (const k of dropKeys) delete copy[k]
          return [key, copy]
        }),
      )
    }
  }

  const { error } = await (supabase as any)
    .from('profiles')
    .update({
      ...(profile_translations ? { profile_translations } : {}),
      bio_cta_label, bio_cta_url,
      display_name, slug, bio, location, website, avatar_url,
      email, social_bluesky, social_linkedin, social_instagram, social_medium, social_custom_url,
    })
    .eq('id', userId)

  if (error?.code === '23505') throw new Error('That URL slug is already taken')
  if (error) throw new Error(error.message)

  await logActivity({ entityType: 'profile', entityId: userId, entityLabel: display_name, action: 'updated' })

  revalidatePath('/dashboard/profile')
  revalidatePath(`/author/${slug}`)
  revalidatePath('/admin/users')
}
