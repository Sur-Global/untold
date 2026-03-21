import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export default async function ConfirmPage() {
  const t = await getTranslations('auth')
  return (
    <main className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-3xl mb-4">UNTOLD</h1>
        <p className="text-muted-foreground">{t('confirmEmail')}</p>
        <Link href="/" className="text-[#A0522D] hover:underline mt-4 inline-block">Back to home</Link>
      </div>
    </main>
  )
}
