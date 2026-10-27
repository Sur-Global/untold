import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import { loadTagCounts } from '@/lib/data/topics'
import { tagDisplayName } from '@/lib/tag-name'
import { TopicsForm, type TopicRow } from '@/components/admin/TopicsForm'

export default async function AdminTopicsPage() {
  await requireAdmin()
  const supabase = await createClient()
  const [{ data }, counts] = await Promise.all([
    (supabase as any).from('tags').select('id, slug, names, is_topic').limit(1000),
    loadTagCounts(supabase),
  ])
  const rows: TopicRow[] = (data ?? []).map((tag: any) => ({
    id: tag.id,
    slug: tag.slug,
    name: tagDisplayName(tag.names, 'es', tag.slug),
    count: counts.get(tag.slug) ?? 0,
    isTopic: !!tag.is_topic,
  }))
  // topics first, then by how much content they have
  rows.sort((a, b) => Number(b.isTopic) - Number(a.isTopic) || b.count - a.count || a.name.localeCompare(b.name))
  return <TopicsForm initial={rows} />
}
