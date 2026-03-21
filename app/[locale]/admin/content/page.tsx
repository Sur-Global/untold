import { createClient } from '@/lib/supabase/server'
import { FeatureButton } from '@/components/admin/FeatureButton'
import { AdminUnpublishButton } from '@/components/admin/AdminUnpublishButton'

export default async function AdminContentPage() {
  const supabase = await createClient()

  const { data: items } = await (supabase as any)
    .from('content')
    .select(`
      id,
      type,
      is_featured,
      published_at,
      content_translations(title, locale),
      profiles!content_author_id_fkey(display_name)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-2xl uppercase tracking-wide">Content</h1>
      <p className="text-sm text-muted-foreground">
        50 most recently published items across all authors.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left font-mono text-xs uppercase text-muted-foreground">
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Author</th>
              <th className="px-6 py-3">Published</th>
              <th className="px-6 py-3">Featured</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item: any) => {
              const enTitle = item.content_translations?.find(
                (t: any) => t.locale === 'en',
              )?.title
              return (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="max-w-xs truncate px-6 py-3 font-medium">
                    {enTitle ?? item.id}
                    {' '}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {item.profiles?.display_name ?? '—'}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <FeatureButton contentId={item.id} isFeatured={item.is_featured} />
                  </td>
                  <td className="px-6 py-3">
                    <AdminUnpublishButton contentId={item.id} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {(!items || items.length === 0) && (
          <p className="py-8 text-center text-muted-foreground">No published content yet.</p>
        )}
      </div>
    </div>
  )
}
