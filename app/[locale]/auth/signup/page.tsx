import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SignupForm } from '@/components/auth/SignupForm'

export default async function SignupPage() {
  const t = await getTranslations('auth')
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-vintage">
        <CardHeader><CardTitle className="text-2xl">{t('signupTitle')}</CardTitle></CardHeader>
        <CardContent>
          <SignupForm />
          <p className="text-center text-sm mt-4 text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link href="/auth/login" className="text-[#A0522D] hover:underline">{t('loginButton')}</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
