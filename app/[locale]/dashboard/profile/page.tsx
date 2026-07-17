import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { EditProfileForm } from '@/components/profile/EditProfileForm'

export default async function EditProfilePage() {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const [{ userId, ...navProps }, { data: profile }] = await Promise.all([
    getNavProps(),
    (supabase as any)
      .from('profiles')
      .select('display_name, slug, bio, location, website, avatar_url')
      .eq('id', user.id)
      .single(),
  ])

  if (!profile) return null

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl font-heading font-bold mb-8">Edit Profile</h1>
        <AdminPanel bodyClassName="p-6">
          <EditProfileForm
            userId={user.id}
            initialDisplayName={profile.display_name ?? ''}
            initialSlug={profile.slug ?? ''}
            initialBio={profile.bio ?? ''}
            initialLocation={profile.location ?? ''}
            initialWebsite={profile.website ?? ''}
            initialAvatarUrl={profile.avatar_url ?? ''}
          />
        </AdminPanel>
      </main>
      <Footer />
    </>
  )
}
