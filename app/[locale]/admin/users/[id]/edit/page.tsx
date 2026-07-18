import { notFound } from 'next/navigation'
import { requireEditor } from '@/lib/require-editor'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
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
      .select('display_name, slug, bio, location, website, avatar_url, role, email, social_bluesky, social_linkedin, social_instagram, social_medium, social_custom_url')
      .eq('id', id)
      .single(),
  ])

  if (!profile) notFound()

  // Most authors were created via bulk import with an auto-generated login
  // email — prefill with that as a starting point so the admin can see and
  // correct it, until `profiles.email` is explicitly set.
  let fallbackEmail = ''
  if (!profile.email) {
    const serviceClient = createServiceRoleClient()
    const { data: authUser } = await serviceClient.auth.admin.getUserById(id)
    fallbackEmail = authUser?.user?.email ?? ''
  }

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
              initialEmail={profile.email ?? fallbackEmail}
              initialSocialBluesky={profile.social_bluesky ?? ''}
              initialSocialLinkedin={profile.social_linkedin ?? ''}
              initialSocialInstagram={profile.social_instagram ?? ''}
              initialSocialMedium={profile.social_medium ?? ''}
              initialSocialCustomUrl={profile.social_custom_url ?? ''}
              isAdminEdit
            />
          </AdminPanel>
        </div>
      </main>
      <Footer />
    </>
  )
}
