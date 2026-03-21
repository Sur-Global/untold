import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { RoleSelect } from '@/components/admin/RoleSelect'
import { SuspendButton } from '@/components/admin/SuspendButton'
import { DeleteUserButton } from '@/components/admin/DeleteUserButton'

export default async function AdminUsersPage() {
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
    <div className="space-y-4">
      <h1 className="font-mono text-2xl uppercase tracking-wide">Users</h1>
      <p className="text-sm text-muted-foreground">50 most recently joined users.</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left font-mono text-xs uppercase text-muted-foreground">
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
              <tr key={profile.id} className="border-b hover:bg-muted/30">
                <td className="px-6 py-3 font-medium">{profile.display_name ?? '—'}</td>
                <td className="px-6 py-3 text-muted-foreground">
                  {emailMap.get(profile.id) ?? '—'}
                </td>
                <td className="px-6 py-3">
                  <RoleSelect userId={profile.id} currentRole={profile.role} />
                </td>
                <td className="px-6 py-3 text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-3">
                  {profile.suspended_at ? (
                    <span className="text-xs font-medium text-red-600">Suspended</span>
                  ) : (
                    <span className="text-xs font-medium text-green-600">Active</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <SuspendButton
                      userId={profile.id}
                      isSuspended={!!profile.suspended_at}
                    />
                    <DeleteUserButton
                      userId={profile.id}
                      displayName={profile.display_name}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {profiles.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No users yet.</p>
        )}
      </div>
    </div>
  )
}
