'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { requireCreator } from '@/lib/require-creator'
import { slugify } from '@/lib/utils'

export async function ensureTag(name: string): Promise<{ id: string; slug: string; name: string }> {
  await requireCreator()
  const slug = slugify(name.trim())
  const service = createServiceRoleClient()

  // Try to insert; if slug already exists, get the existing one
  const { data: inserted } = await (service as any)
    .from('tags')
    .upsert({ slug, names: { en: name.trim() } }, { onConflict: 'slug' })
    .select('id, slug, names')
    .single()

  if (inserted) return { id: inserted.id, slug: inserted.slug, name: inserted.names?.en ?? inserted.slug }

  // Fallback: fetch existing
  const { data: existing } = await (service as any)
    .from('tags')
    .select('id, slug, names')
    .eq('slug', slug)
    .single()

  return { id: existing.id, slug: existing.slug, name: existing.names?.en ?? existing.slug }
}

export async function syncContentTags(contentId: string, tagIds: string[]): Promise<void> {
  const { user } = await requireCreator()
  const supabase = await createClient()

  // Verify ownership
  const { data: content } = await (supabase as any)
    .from('content')
    .select('id')
    .eq('id', contentId)
    .eq('author_id', user.id)
    .single()

  if (!content) throw new Error('Content not found or not owned')

  // Delete existing and re-insert
  await (supabase as any).from('content_tags').delete().eq('content_id', contentId)

  if (tagIds.length > 0) {
    await (supabase as any)
      .from('content_tags')
      .insert(tagIds.map((tag_id) => ({ content_id: contentId, tag_id })))
  }
}
