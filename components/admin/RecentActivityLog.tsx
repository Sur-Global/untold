import { createClient } from '@/lib/supabase/server'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { adminTableHead, adminTableRow } from '@/components/admin/admin-ui'

const ACTION_LABELS: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  published: 'published',
  unpublished: 'unpublished',
  deleted: 'deleted',
  featured: 'featured',
  unfeatured: 'unfeatured',
  hero_featured: 'added to homepage hero',
  hero_unfeatured: 'removed from homepage hero',
  suspended: 'suspended',
  unsuspended: 'unsuspended',
}

function describeAction(action: string): string {
  if (action.startsWith('role_changed_to_')) {
    return `changed role to ${action.replace('role_changed_to_', '')}`
  }
  return ACTION_LABELS[action] ?? action
}

const ENTITY_LABELS: Record<string, string> = {
  article: 'article',
  video: 'video',
  podcast: 'podcast',
  pill: 'pill',
  course: 'course',
  content: 'content',
  profile: 'profile',
  user: 'user',
  static_page: 'page',
}

export async function RecentActivityLog() {
  const supabase = await createClient()

  const { data: entries } = await (supabase as any)
    .from('activity_log')
    .select('id, entity_type, entity_label, action, actor_name, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <AdminPanel title="Activity Log">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={adminTableHead}>
              <th className="px-6 py-3">Who</th>
              <th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">Item</th>
              <th className="px-6 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {(entries ?? []).map((entry: any) => (
              <tr key={entry.id} className={adminTableRow}>
                <td className="px-6 py-3 font-medium">{entry.actor_name ?? 'Unknown'}</td>
                <td className="px-6 py-3 text-muted-foreground">{describeAction(entry.action)}</td>
                <td className="px-6 py-3 text-muted-foreground">
                  {entry.entity_label ?? '—'}{' '}
                  <span className="ml-1 rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                    {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
                  </span>
                </td>
                <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!entries || entries.length === 0) && (
          <p className="py-10 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
        )}
      </div>
    </AdminPanel>
  )
}
