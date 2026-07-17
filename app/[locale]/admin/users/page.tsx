import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { requireEditor } from '@/lib/require-editor'
import { RoleSelect } from '@/components/admin/RoleSelect'
import { SuspendButton } from '@/components/admin/SuspendButton'
import { DeleteUserButton } from '@/components/admin/DeleteUserButton'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { adminTableHead, adminTableRow } from '@/components/admin/admin-ui'
import { Link } from '@/i18n/navigation'

export default async function AdminUsersPage() {
  const { profile: viewer } = await requireEditor()
  const viewerIsAdmin = viewer.role === 'admin'
  const supabase = await createClient()
  const serviceClient = createServiceRoleClient()

  const [profilesResult, usersResult] = await Promise.all([
    (supabase as any)
      .from('profiles')
      .select('id, display_name, role, created_at, suspended_at')
      .order('created_at', { ascending: false })
      .limit(50),
    serviceClient.auth.admin.listUsers({ page: 1, perPage: 50 }),
  ])

  const profiles: any[] = profilesResult.data ?? []
  const authUsers: any[] = usersResult.data?.users ?? []
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email as string]))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="Fifty most recently joined accounts. Adjust roles, suspend, or remove users."
      />

      <AdminPanel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={adminTableHead}>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className={adminTableRow}>
                  <td className="px-6 py-3 font-medium">{profile.display_name ?? '—'}</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {emailMap.get(profile.id) ?? '—'}
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
          {profiles.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">No users yet.</p>
          )}
        </div>
      </AdminPanel>
    </div>
  )
}
