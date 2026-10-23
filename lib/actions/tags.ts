'use server'

import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { requireCreator } from '@/lib/require-creator'
import { slugify } from '@/lib/utils'
import { SUPPORTED_LOCALES } from '@/lib/deepl'
import { tagDisplayName, tagSlugFor } from '@/lib/tag-name'
import { triggerTagTranslations } from '@/lib/trigger-tag-translations'

/**
 * The tag a person typed, in the language they are writing in: it is found by its slug if it already exists
 * (and left exactly as it is), or created with that name in their language and translated into the others.
 */
export async function ensureTag(name: string, locale: string = 'en'): Promise<{ id: string; slug: string; name: string }> {
  await requireCreator()
  const label = name.trim()
  const slug = tagSlugFor(label, slugify)
  if (!slug) throw new Error('A tag needs a name')
  const language = (SUPPORTED_LOCALES as readonly string[]).includes(locale) ? locale : 'en'
  const service = createServiceRoleClient()

  const shown = (tag: { id: string; slug: string; names: Record<string, string> | null }) => ({
    id: tag.id,
    slug: tag.slug,
    name: tagDisplayName(tag.names, language, tag.slug),
  })
  const find = () => (service as any).from('tags').select('id, slug, names').eq('slug', slug).maybeSingle()

  const { data: existing } = await find()
  if (existing) return shown(existing)

  const { data: created } = await (service as any)
    .from('tags')
    .insert({ slug, names: { [language]: label } })
    .select('id, slug, names')
    .single()
  if (created) {
    after(() => Promise.all(SUPPORTED_LOCALES.map((l) => triggerTagTranslations(l))))
    return shown(created)
  }

  // Someone created the same tag at the same moment
  const { data: raced } = await find()
  if (!raced) throw new Error('Could not create the tag')
  return shown(raced)
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
