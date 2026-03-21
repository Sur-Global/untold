import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/components/auth/LoginForm'

export default async function LoginPage() {
  const t = await getTranslations('auth')
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-vintage">
        <CardHeader><CardTitle className="text-2xl">{t('loginTitle')}</CardTitle></CardHeader>
        <CardContent>
          <LoginForm />
          <p className="text-center text-sm mt-4 text-muted-foreground">
            {t('noAccount')}{' '}
            <Link href="/auth/signup" className="text-[#A0522D] hover:underline">{t('signupButton')}</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
