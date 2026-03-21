import { requireUser } from '@/lib/require-user'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function BookmarksPage({ params }: PageProps) {
  const { locale } = await params
  const { user } = await requireUser()
  const supabase = await createClient()

  // requireUser already verified auth — derive nav props without a second getUser() call
  const { data: navProfile } = await (supabase as any)
    .from('profiles').select('role').eq('id', user.id).single()
  const navProps = { isLoggedIn: true, userRole: (navProfile?.role ?? null) as any }

  const { data: bookmarks } = await (supabase as any)
    .from('bookmarks')
    .select(`
      content_id, created_at,
      content (
        id, type, slug, status,
        content_translations ( title, locale )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const publishedBookmarks = (bookmarks ?? []).filter(
    (bm: any) => bm.content?.status === 'published'
  )

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="mb-8">My Bookmarks</h1>

        {publishedBookmarks.length === 0 ? (
          <p className="text-[#6B5F58]">No bookmarks yet. Visit any content page and click the bookmark icon.</p>
        ) : (
          <ul className="space-y-3">
            {publishedBookmarks.map((bm: any) => {
              const item = bm.content
              const tr = getTranslation(item.content_translations ?? [], locale)
              return (
                <li
                  key={bm.content_id}
                  className="p-4 rounded-lg"
                  style={{ border: '1px solid rgba(139,69,19,0.12)', background: 'rgba(245,241,232,0.5)' }}
                >
                  <Link
                    href={`/${item.type}s/${item.slug}`}
                    className="font-semibold hover:text-[#A0522D] transition-colors"
                  >
                    {tr?.title ?? '(Untitled)'}
                  </Link>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono text-[#6B5F58] capitalize">{item.type}</span>
                    <span className="text-xs font-mono text-[#6B5F58]">
                      Saved {new Date(bm.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <Footer />
    </>
  )
}
