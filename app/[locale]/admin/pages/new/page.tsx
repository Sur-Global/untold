import { Link } from '@/i18n/navigation'
import { requireAdmin } from '@/lib/require-admin'
import { StaticPageForm } from '@/components/admin/StaticPageForm'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'

export default async function AdminNewStaticPage() {
  await requireAdmin()
  return (
    <div className="space-y-6">
      <Link
        href="/admin/pages"
        className="inline-block text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        ← Back to pages
      </Link>
      <AdminPageHeader
        title="New page"
        description="Choose a URL slug, add titles and body copy per locale, then publish when ready."
      />
      <AdminPanel title="Page details" bodyClassName="p-6 lg:p-8">
        <StaticPageForm />
      </AdminPanel>
    </div>
  )
}
