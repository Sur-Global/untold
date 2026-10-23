import type { SupabaseClient } from '@supabase/supabase-js'
import { buildTagCloud, type CloudTag } from '@/lib/tag-cloud'

/** Topics of the published content of one kind ('video', 'podcast'…), with how much content each has */
export async function loadTagCloud(supabase: SupabaseClient, type: string, locale: string): Promise<CloudTag[]> {
  const { data } = await (supabase as any)
    .from('content_tags')
    .select('tags ( slug, names ), content!inner ( type, status, is_curated )')
    .eq('content.type', type)
    .eq('content.status', 'published')
    .eq('content.is_curated', true)
    .limit(5000)
  return buildTagCloud(data ?? [], locale)
}

const NO_CONTENT = '00000000-0000-0000-0000-000000000000'

/** Ids of the content that has a topic; a topic that does not exist gives a list that matches nothing */
export async function contentIdsForTag(supabase: SupabaseClient, slug: string): Promise<string[]> {
  const { data: tag } = await (supabase as any).from('tags').select('id').eq('slug', slug).maybeSingle()
  if (!tag) return [NO_CONTENT]
  const { data } = await (supabase as any).from('content_tags').select('content_id').eq('tag_id', tag.id).limit(5000)
  const ids = (data ?? []).map((r: any) => r.content_id as string)
  return ids.length ? ids : [NO_CONTENT]
}
