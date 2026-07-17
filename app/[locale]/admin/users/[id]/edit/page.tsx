import { notFound } from 'next/navigation'
import { requireEditor } from '@/lib/require-editor'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { EditProfileForm } from '@/components/profile/EditProfileForm'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminEditUserPage({ params }: PageProps) {
  const { id } = await params
  await requireEditor()
  const supabase = await createClient()

  const [{ userId, ...navProps }, { data: profile }] = await Promise.all([
    getNavProps(),
    (supabase as any)
      .from('profiles')
      .select('display_name, slug, bio, location, website, avatar_url, role')
      .eq('id', id)
      .single(),
  ])

  if (!profile) notFound()

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <AdminPageHeader
          title={`Edit: ${profile.display_name}`}
          description="Update this user's public profile information."
        />
        <div className="mt-6">
          <AdminPanel bodyClassName="p-6">
            <EditProfileForm
              userId={id}
              initialDisplayName={profile.display_name ?? ''}
              initialSlug={profile.slug ?? ''}
              initialBio={profile.bio ?? ''}
              initialLocation={profile.location ?? ''}
              initialWebsite={profile.website ?? ''}
              initialAvatarUrl={profile.avatar_url ?? ''}
              isAdminEdit
            />
          </AdminPanel>
        </div>
      </main>
      <Footer />
    </>
  )
}
