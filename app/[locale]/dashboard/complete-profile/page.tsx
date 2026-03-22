import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CompleteProfileForm } from '@/components/auth/CompleteProfileForm'

export default async function CompleteProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles').select('slug').eq('id', user.id).single() as { data: { slug: string } | null }
  if (profile && !profile.slug.startsWith('user-')) redirect('/')

  const t = await getTranslations('auth')
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-vintage">
        <CardHeader><CardTitle className="text-2xl">{t('completeProfileTitle')}</CardTitle></CardHeader>
        <CardContent><CompleteProfileForm /></CardContent>
      </Card>
    </main>
  )
}
