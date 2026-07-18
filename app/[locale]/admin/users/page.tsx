import { createClient } from '@/lib/supabase/server'
import { requireEditor } from '@/lib/require-editor'
import { RoleSelect } from '@/components/admin/RoleSelect'
import { SuspendButton } from '@/components/admin/SuspendButton'
import { DeleteUserButton } from '@/components/admin/DeleteUserButton'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { AdminPagination } from '@/components/admin/AdminPagination'
import { SortableHeader } from '@/components/admin/SortableHeader'
import { adminTableHead, adminTableRow } from '@/components/admin/admin-ui'
import { Link } from '@/i18n/navigation'

const PAGE_SIZE = 50
const SORTABLE_FIELDS: Record<string, string> = {
  name: 'display_name',
  email: 'email',
  role: 'role',
  joined: 'created_at',
}

interface PageProps {
  searchParams: Promise<{ page?: string; sort?: string; order?: string }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { page: pageStr, sort, order } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const sortColumn = SORTABLE_FIELDS[sort ?? ''] ?? 'created_at'
  const ascending = order === 'asc'

  const { profile: viewer } = await requireEditor()
  const viewerIsAdmin = viewer.role === 'admin'
  const supabase = await createClient()

  const [{ data: profiles }, { count }] = await Promise.all([
    (supabase as any)
      .from('profiles')
      .select('id, display_name, email, role, created_at, suspended_at')
      .order(sortColumn, { ascending, nullsFirst: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    (supabase as any)
      .from('profiles')
      .select('id', { count: 'exact', head: true }),
  ])

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description={`${count ?? 0} total accounts. Adjust roles, suspend, or remove users.`}
      />

      <AdminPanel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={adminTableHead}>
                <th className="px-6 py-3"><SortableHeader label="Name" field="name" /></th>
                <th className="px-6 py-3"><SortableHeader label="Email" field="email" /></th>
                <th className="px-6 py-3"><SortableHeader label="Role" field="role" /></th>
                <th className="px-6 py-3"><SortableHeader label="Joined" field="joined" defaultOrder="desc" /></th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((profile: any) => (
                <tr key={profile.id} className={adminTableRow}>
                  <td className="px-6 py-3 font-medium">{profile.display_name ?? '—'}</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {profile.email ?? '—'}
                  </td>
                  <td className="px-6 py-3">
                    <RoleSelect
                      userId={profile.id}
                      currentRole={profile.role}
                      viewerIsAdmin={viewerIsAdmin}
                    />
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    {profile.suspended_at ? (
                      <span className="text-xs font-semibold text-destructive">Banned</span>
                    ) : (
                      <span className="text-xs font-semibold text-secondary">Active</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/users/${profile.id}/edit`}
                        className="text-xs font-['JetBrains_Mono',monospace] text-primary underline-offset-4 hover:underline"
                      >
                        Edit
                      </Link>
                      <SuspendButton
                        userId={profile.id}
                        isSuspended={!!profile.suspended_at}
                        disabled={!viewerIsAdmin && profile.role === 'admin'}
                      />
                      <DeleteUserButton
                        userId={profile.id}
                        displayName={profile.display_name}
                        disabled={!viewerIsAdmin && profile.role === 'admin'}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!profiles || profiles.length === 0) && (
            <p className="py-10 text-center text-sm text-muted-foreground">No users yet.</p>
          )}
        </div>
      </AdminPanel>

      <AdminPagination page={page} totalPages={totalPages} />
    </div>
  )
}
